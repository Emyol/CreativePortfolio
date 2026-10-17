"""Side A: the pocket tape player, rendered as the layered sprites the site stacks.

Run from the repo root (see README.md):
  blender -b --factory-startup -P art/blender/side-a/device.py [-- --only plate,hub --samples 64]
  node scripts/encode-device.mjs

Every top-down sprite is rendered with the same orthographic scale (PPU pixels per unit),
so the browser can lay them over the plate using the fractions in public/device/layout.json.
Moving parts (reels, tape packs, knob mark, keys, cassette shell) are separate passes; the
plate holds everything that never moves.
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *

OPTS = args()
sc = reset("SideA", samples=OPTS["samples"])
sc.view_settings.exposure = 0.15
world_color("#B9BDC3", 0.35)

# ---------------------------------------------------------------- dimensions (units)
W, D, H = 7.6, 5.0, 0.62           # body, plan view and height
MARGIN = 0.5                        # canvas margin around the body, room for the shadow
CW, CD = W + 2 * MARGIN, D + 2 * MARGIN
PPU = 2400 / CW                     # plate renders 2400 px wide (2x a 1200 px display)

WINDOW = (-1.53, 0.84, 3.9, 2.68)   # tape window recess: cx, cy, w, h
CASSETTE = (WINDOW[0], WINDOW[1], 3.62, 2.32)
HUB_DX, HUB_DY = 0.755, 0.06       # reels relative to the cassette centre
HUB_R = 0.24                        # hub sprite radius (ring plus teeth)
PACK_MIN, PACK_MAX = 0.28, 0.72     # tape-pack radii
KEY_W, KEY_D, KEY_GAP, KEY_Y = 0.84, 0.58, 0.18, -1.45
KEY_X0 = WINDOW[0] - WINDOW[2] / 2 + KEY_W / 2
KEY_PAD = 0.16                      # sprite canvas beyond the cap on each side (shadow)
SCREEN = (2.15, 1.59, 2.66, 1.18)   # recess
SCREEN_INSET = 0.12                 # recess edge to the live text area
NAMEPLATE = (1.62, 0.66, 1.6, 0.34)
LED = (3.36, 0.66)
KNOB = (1.72, -0.95)
KNOB_R, KNOB_H = 0.62, 0.40
KNOB_SPRITE = 2 * (KNOB_R + 0.3)
FLOOR = H - 0.26                    # tape-window floor
KEY_FLOOR = H - 0.10
FLIP_FRAMES = 24

# ---------------------------------------------------------------- materials
def brushed(name, base, rough=0.3, aniso=0.7, streak_scale=900):
    """Brushed aluminium: anisotropic along X with fine streaks in roughness and bump."""
    m = principled(name, base, metallic=1.0, rough=rough, aniso=aniso)
    nt, p = m.node_tree, bsdf(m)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.5, streak_scale, 1.5)
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.0
    nz.inputs["Detail"].default_value = 8.0
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["To Min"].default_value = rough - 0.07
    ramp.inputs["To Max"].default_value = rough + 0.07
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.05
    bump.inputs["Distance"].default_value = 0.002
    tan = nt.nodes.new("ShaderNodeCombineXYZ")  # a fixed tangent: brushed along X
    tan.inputs["X"].default_value = 1.0
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    nt.links.new(nz.outputs["Fac"], ramp.inputs["Value"])
    nt.links.new(ramp.outputs["Result"], p.inputs["Roughness"])
    nt.links.new(nz.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    nt.links.new(tan.outputs["Vector"], p.inputs["Tangent"])
    return m


def rings(name, base, rough, freq=260.0, amount=0.08, metallic=0.0):
    """Concentric micro-rings (tape pack edges, turned metal) in roughness."""
    m = principled(name, base, metallic=metallic, rough=rough)
    nt, p = m.node_tree, bsdf(m)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeVectorMath")
    sep.operation = "LENGTH"
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = freq
    wav = nt.nodes.new("ShaderNodeMath")
    wav.operation = "SINE"
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 40
    add = nt.nodes.new("ShaderNodeMath")
    add.operation = "MULTIPLY_ADD"
    add.inputs[1].default_value = amount
    add.inputs[2].default_value = rough
    mix = nt.nodes.new("ShaderNodeMath")
    mix.operation = "MULTIPLY"
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    nt.links.new(sep.outputs["Value"], mul.inputs[0])
    nt.links.new(mul.outputs[0], wav.inputs[0])
    nt.links.new(wav.outputs[0], mix.inputs[0])
    nt.links.new(nz.outputs["Fac"], mix.inputs[1])
    nt.links.new(mix.outputs[0], add.inputs[0])
    nt.links.new(add.outputs[0], p.inputs["Roughness"])
    return m


def knurled(name, base, ribs=90):
    """The knob's grip: fine vertical ribs as a bump on the side wall only (masked by the
    normal, so the top stays smooth)."""
    m = principled(name, base, rough=0.34, coat=0.55, coat_rough=0.12)
    nt, p = m.node_tree, bsdf(m)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ang = nt.nodes.new("ShaderNodeMath"); ang.operation = "ARCTAN2"
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = ribs
    sin = nt.nodes.new("ShaderNodeMath"); sin.operation = "SINE"
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    nsep = nt.nodes.new("ShaderNodeSeparateXYZ")
    absz = nt.nodes.new("ShaderNodeMath"); absz.operation = "ABSOLUTE"
    side = nt.nodes.new("ShaderNodeMath"); side.operation = "SUBTRACT"; side.inputs[0].default_value = 1.0
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Distance"].default_value = 0.004
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    nt.links.new(sep.outputs["Y"], ang.inputs[0])
    nt.links.new(sep.outputs["X"], ang.inputs[1])
    nt.links.new(ang.outputs[0], mul.inputs[0])
    nt.links.new(mul.outputs[0], sin.inputs[0])
    nt.links.new(sin.outputs[0], bump.inputs["Height"])
    nt.links.new(geo.outputs["Normal"], nsep.inputs[0])
    nt.links.new(nsep.outputs["Z"], absz.inputs[0])
    nt.links.new(absz.outputs[0], side.inputs[1])
    nt.links.new(side.outputs[0], bump.inputs["Strength"])
    nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    return m


M = {
    "alu": brushed("Aluminium", "#C9CDD3"),
    "alu_door": brushed("AluDoor", "#C3C7CD", rough=0.36),
    "collar": rings("Collar", "#B9BDC4", 0.22, freq=420, amount=0.06, metallic=1.0),
    "oled": principled("OLED", "#040405", rough=0.3, coat=0.25, coat_rough=0.06),
    "led": principled("LED", "#1C0602", rough=0.08, coat=1.0),
    "grille": principled("Grille", "#16171A", rough=0.7),
    "shell": principled("Shell", "#2A2C31", rough=0.42),
    "shell_in": principled("ShellInside", "#7A7E85", rough=0.5),
    "label": principled("Label", "#EFEDE8", rough=0.85),
    "ink": principled("Ink", "#16171A", rough=0.6),
    "ink_soft": principled("InkSoft", "#9CA0A7", rough=0.7),
    "glass": principled("Window", "#F2F6F8", rough=0.03, transmission=1.0, ior=1.49),
    "tape": rings("Tape", "#1E120C", 0.2, freq=900, amount=0.1, metallic=0.35),
    "hub": principled("Hub", "#F3F3F1", rough=0.42),
    "screw": rings("Screw", "#9EA2A8", 0.3, freq=0, amount=0.0, metallic=1.0),
    "knob": knurled("Knob", "#FF2E00"),
    "mark": principled("KnobMark", "#FAFAF8", rough=0.4),
    "key": principled("Key", "#A2A6AD", rough=0.48),
    "rubber": principled("Rubber", "#1A1B1E", rough=0.85),
    "sticker": principled("Sticker", "#F4F4F1", rough=0.8),
    "glow": principled("ScreenText", "#000000", emission="#FF5A1F", emission_strength=6),
    "glow_w": principled("ScreenTextW", "#000000", emission="#E9E9E9", emission_strength=3),
    "floor": principled("Table", "#E4E6E9", rough=0.75),
}

# ---------------------------------------------------------------- the body
body = rrect("Body", W, D, H, 0.42, (0, 0, 0), M["alu"], seg=16)
cutters = [
    rrect("WinCut", WINDOW[2], WINDOW[3], 0.4, 0.22, (WINDOW[0], WINDOW[1], FLOOR)),
    rrect("ScrCut", SCREEN[2], SCREEN[3], 0.3, 0.12, (SCREEN[0], SCREEN[1], H - 0.06)),
    disc("LedCut", 0.06, 0.3, (LED[0], LED[1], H - 0.04), seg=48),
]
KEYS = []
for i in range(4):
    x = KEY_X0 + i * (KEY_W + KEY_GAP)
    KEYS.append((x, KEY_Y))
    cutters.append(rrect(f"KeyWell{i}", KEY_W + 0.1, KEY_D + 0.1, 0.4, 0.15, (x, KEY_Y, KEY_FLOOR)))
for i in range(4):
    for j in range(9):
        cutters.append(disc(f"Grille{i}{j}", 0.044, 0.5, (2.88 + i * 0.18, -1.74 + j * 0.19, H - 0.3), seg=24))
cut(body, cutters)
bevel(body, 0.045, seg=5)
smooth(body)

oled = rrect("OLEDGlass", SCREEN[2] - 0.03, SCREEN[3] - 0.03, 0.02, 0.105, (SCREEN[0], SCREEN[1], H - 0.06), M["oled"])
led = disc("LEDLens", 0.058, 0.03, (LED[0], LED[1], H - 0.04), M["led"], seg=48)
collar = disc("KnobCollar", KNOB_R + 0.09, 0.012, (KNOB[0], KNOB[1], H - 0.004), M["collar"], seg=160)
grille_floor = rrect("GrilleFloor", 0.8, 1.75, 0.01, 0.05, (3.15, -0.98, H - 0.3), M["grille"])
PLATE_PARTS = [body, oled, led, collar, grille_floor]

# ---------------------------------------------------------------- the cassette
def empty(name, loc=(0, 0, 0), rot=(0, 0, 0), parent=None):
    e = link(bpy.data.objects.new(name, None))
    e.location, e.rotation_euler = loc, rot
    e.parent = parent
    return e


def parent_to(ob, p):
    ob.parent = p
    return ob


CAS_W, CAS_D = CASSETTE[2], CASSETTE[3]
WIN_W, WIN_D = 2.42, 0.94


def shell_half(prefix, letter, parent):
    """One cassette half, built facing up at local z .14 to .204, centred on the cassette."""
    z0 = 0.14
    parts = []
    plate_ = rrect(prefix + "Plate", CAS_W, CAS_D, 0.06, 0.14, (0, 0, z0), M["shell"])
    hole = rrect(prefix + "WinHole", WIN_W, WIN_D, 0.3, 0.14, (0, HUB_DY, z0 - 0.1))
    cut(plate_, [hole])
    bevel(plate_, 0.012, seg=3)
    smooth(plate_)
    parts.append(plate_)
    glass = rrect(prefix + "Glass", WIN_W, WIN_D, 0.03, 0.14, (0, HUB_DY, z0 + 0.02), M["glass"])
    parts.append(glass)
    label = rrect(prefix + "Label", 3.2, 1.62, 0.003, 0.06, (0, 0.25, z0 + 0.06), M["label"])
    lhole = rrect(prefix + "LabelHole", WIN_W + 0.08, WIN_D + 0.08, 0.2, 0.18, (0, HUB_DY, z0))
    cut(label, [lhole])
    parts.append(label)
    lz = z0 + 0.0635
    lt = text(letter, "SpaceMono-Bold.ttf", size=0.4)
    lt.location = (-1.44, HUB_DY - 0.02, lz)
    assign(lt, M["ink"])
    parts.append(lt)
    for k, y in enumerate((0.72, 0.9)):
        parts.append(rrect(f"{prefix}Rule{k}", 2.9, 0.012, 0.0008, 0, (0, y, lz), M["ink_soft"]))
    # direction-of-play arrow, right of the window
    arrow = prism(prefix + "Arrow", [(1.36, HUB_DY + 0.065), (1.36, HUB_DY - 0.065), (1.49, HUB_DY)], 0.0008, (0, 0, lz), M["ink"])
    parts.append(arrow)
    # the tape-access trapezoid along the bottom edge
    trap = prism(prefix + "Trap", [(-1.32, -1.16), (1.32, -1.16), (1.1, -0.74), (-1.1, -0.74)], 0.018, (0, 0, z0 + 0.06), M["shell"])
    bevel(trap, 0.008, seg=2)
    parts.append(trap)
    for k, x in enumerate((-0.62, 0.62)):
        parts.append(disc(f"{prefix}Pin{k}", 0.07, 0.02, (x, -0.98, z0 + 0.065), M["grille"], seg=48))
    for k, (x, y) in enumerate(((-1.68, 1.03), (1.68, 1.03), (-1.68, -1.03), (1.68, -1.03), (0, -0.92))):
        s = disc(f"{prefix}Screw{k}", 0.052, 0.012, (x, y, z0 + 0.06 + (0.018 if k == 4 else 0)), M["screw"], seg=48)
        parts.append(s)
        slot = rrect(f"{prefix}Slot{k}", 0.075, 0.012, 0.002, 0, (x, y, s.location.z + 0.012), M["ink"])
        slot.rotation_euler.z = math.radians(30 + 40 * k)
        parts.append(slot)
    for p in parts + [hole, lhole]:
        p.parent = parent  # cutters too, or the booleans miss once the parent moves
    return parts


cas = empty("Cassette", (CASSETTE[0], CASSETTE[1], FLOOR))
front = empty("FrontHalf", parent=cas)
back = empty("BackHalf", (0, 0, 0.204), (0, math.pi, 0), parent=cas)
FRONT = shell_half("A_", "A", front)
BACK = shell_half("B_", "B", back)
# the side walls joining the halves; only seen edge-on, mid-flip
wall = rrect("Wall", CAS_W - 0.02, CAS_D - 0.02, 0.09, 0.13, (0, 0, 0.058), M["shell"])
wall_cut = rrect("WallCut", CAS_W - 0.16, CAS_D - 0.16, 0.3, 0.08, (0, 0, -0.1))
wall.parent = cas
wall_cut.parent = cas
cut(wall, [wall_cut])
bevel(wall, 0.01, seg=2)
smooth(wall)
# inside face of the back half, seen through the window (rendered with the plate)
interior = rrect("Interior", CAS_W - 0.1, CAS_D - 0.1, 0.004, 0.12, (0, 0, 0.066), M["shell_in"])
interior.parent = cas


def hub(name, x):
    """White take-up hub: a ring with six inner teeth, open in the middle."""
    ring = disc(name, HUB_R - 0.02, 0.08, (x, HUB_DY, 0.065), M["hub"], seg=96)
    hole = disc(name + "Hole", 0.13, 0.3, (x, HUB_DY, -0.05), seg=96)
    hole.parent = cas
    cut(ring, [hole])
    bevel(ring, 0.01, seg=3)
    smooth(ring)
    parts = [ring]
    for k in range(6):
        a = k * math.pi / 3
        t = rrect(f"{name}Tooth{k}", 0.07, 0.035, 0.08, 0.01, (x + math.cos(a) * 0.12, HUB_DY + math.sin(a) * 0.12, 0.065), M["hub"])
        t.rotation_euler.z = a
        parts.append(t)
    for p in parts:
        p.parent = cas
    return parts


HUB_L = hub("HubL", -HUB_DX)
HUB_R_PARTS = hub("HubR", HUB_DX)


def pack(name, x, r):
    p = disc(name, r, 0.064, (x, HUB_DY, 0.068), M["tape"], seg=192)
    p.parent = cas
    return p


# the pack sprite: one full pack on the left reel; the browser scales it
PACK_SPRITE = pack("PackSprite", -HUB_DX, PACK_MAX)


def packs_at(progress):
    def rad(f):
        return math.sqrt(PACK_MIN ** 2 + (PACK_MAX ** 2 - PACK_MIN ** 2) * f)
    return pack("PackL", -HUB_DX, rad(1 - progress)), pack("PackR", HUB_DX, rad(progress))


# ---------------------------------------------------------------- knob and keys
knob = disc("Knob", KNOB_R, KNOB_H, (KNOB[0], KNOB[1], H), M["knob"], seg=160)
dish = bpy.data.objects.new("KnobDish", bpy.data.meshes.new("KnobDishMesh"))
link(dish)
import bmesh
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=48, radius=3.0)
bm.to_mesh(dish.data)
bm.free()
dish.location = (KNOB[0], KNOB[1], H + KNOB_H + 3.0 - 0.03)
cut(knob, [dish])
bevel(knob, 0.05, seg=6)
smooth(knob)
mark = rrect("KnobMark", 0.07, 0.36, 0.004, 0.035, (KNOB[0], KNOB[1] + 0.25, H + KNOB_H - 0.025), M["mark"])


def key(name, x, y, down=False):
    z = KEY_FLOOR + (0.0 if not down else -0.035)
    k = rrect(name, KEY_W, KEY_D, 0.2, 0.11, (x, y, z), M["key"])
    scoop = bpy.data.objects.new(name + "Scoop", bpy.data.meshes.new(name + "ScoopMesh"))
    link(scoop)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=4.0)
    bm.to_mesh(scoop.data)
    bm.free()
    scoop.location = (x, y, z + 0.2 + 4.0 - 0.022)
    cut(k, [scoop])
    bevel(k, 0.035, seg=5)
    smooth(k)
    return k


KEY_UP = key("KeyUp", *KEYS[0])
KEY_DOWN = key("KeyDown", *KEYS[0], down=True)
KEY_CATCH = plane("KeyCatch", KEY_W + 0.1, KEY_D + 0.1, (KEYS[0][0], KEYS[0][1], KEY_FLOOR + 0.0005), catcher=True, r=0.15)
KNOB_CATCH = plane("KnobCatch", KNOB_SPRITE, KNOB_SPRITE, (KNOB[0], KNOB[1], H + 0.0005), catcher=True)
SHELL_CATCH = rrect("ShellCatch", CAS_W - 0.1, CAS_D - 0.1, 0.0005, 0.12, (0, 0, 0.0705))
SHELL_CATCH.is_shadow_catcher = True
SHELL_CATCH.parent = cas
TABLE_CATCH = plane("TableCatch", 30, 30, (0, 0, -0.0005), catcher=True)

# ---------------------------------------------------------------- underside (footer)
under = rrect("Under", W, D, H, 0.42, (0, 0, 0), M["alu"], seg=16)
bevel(under, 0.045, seg=5)
smooth(under)
STICKER = (-1.35, 0.0, 3.7, 2.7)
sticker = rrect("Sticker", STICKER[2], STICKER[3], 0.004, 0.08, (STICKER[0], STICKER[1], H), M["sticker"])
door = rrect("Door", 2.3, 3.1, 0.006, 0.12, (2.15, 0, H), M["alu_door"])
bevel(door, 0.004, seg=2)
UNDER_PARTS = [under, sticker, door]
for k, (x, y) in enumerate(((-3.1, 2.0), (3.1, 2.0), (-3.1, -2.0), (3.1, -2.0))):
    f = disc(f"Foot{k}", 0.3, 0.09, (x, y, H), M["rubber"], seg=96)
    bevel(f, 0.035, seg=4)
    smooth(f)
    UNDER_PARTS.append(f)
for k, (x, y) in enumerate(((-3.45, 0.0), (3.45, 0.0), (0.6, 2.15), (0.6, -2.15))):
    s = disc(f"UScrew{k}", 0.07, 0.01, (x, y, H), M["screw"], seg=48)
    UNDER_PARTS.append(s)
    sl = rrect(f"USlot{k}", 0.1, 0.016, 0.002, 0, (x, y, H + 0.01), M["ink"])
    sl.rotation_euler.z = math.radians(20 + 50 * k)
    UNDER_PARTS.append(sl)

# ---------------------------------------------------------------- beauty-only print and screen
BEAUTY_ONLY = []
for txt, size, (x, y), mat, font, align in [
    ("SIDE A", 0.3, (SCREEN[0] - SCREEN[2] / 2 + 0.22, SCREEN[1] + 0.22), M["glow"], "SpaceMono-Bold.ttf", "LEFT"),
    ("01  about", 0.19, (SCREEN[0] - SCREEN[2] / 2 + 0.22, SCREEN[1] - 0.12), M["glow_w"], "SpaceMono-Regular.ttf", "LEFT"),
    ("miel", 0.3, (NAMEPLATE[0] - NAMEPLATE[2] / 2, NAMEPLATE[1]), M["ink"], "SpaceMono-Bold.ttf", "LEFT"),
]:
    t = text(txt, font, size=size, align=align)
    t.location = (x, y, (H - 0.035) if mat is not M["ink"] else H + 0.001)
    assign(t, mat)
    BEAUTY_ONLY.append(t)
for i, lab in enumerate(["about", "events", "mixtape", "people"]):
    t = text(lab, "SpaceMono-Regular.ttf", size=0.15)
    t.location = (KEYS[i][0], KEY_Y - KEY_D / 2 - 0.25, H + 0.001)
    assign(t, M["ink"])
    BEAUTY_ONLY.append(t)
progress = rrect("Progress", 2.1, 0.03, 0.002, 0, (SCREEN[0], SCREEN[1] - 0.38, H - 0.035), M["glow_w"])
playhead = rrect("Playhead", 0.6, 0.05, 0.003, 0, (SCREEN[0] - 0.75, SCREEN[1] - 0.38, H - 0.034), M["glow"])
BEAUTY_ONLY += [progress, playhead]

# ---------------------------------------------------------------- lights
# The top face of a flat device mirrors whatever is straight above it, so the softbox is
# placed over the upper left only: the sheen falls off diagonally across the plate.
area_light("Key", (-7, 6, 10), (0, 0, 0), 7, 1500)
area_light("Top", (-3.2, 3.0, 7), (-3.2, 3.0, 0), 7, 260, size_y=4)
area_light("Fill", (8, -6, 5), (0, 0, 0.3), 6, 160, "#EEF2FF")

cam = ortho_camera()

# ---------------------------------------------------------------- passes
def all_children(ob):
    return [ob] + [c for ch in ob.children for c in all_children(ch)]


def mesh_children(ob):
    return [o for o in all_children(ob) if o.type in {"MESH", "FONT"}]


def wanted(slug):
    return OPTS["only"] is None or slug in OPTS["only"]


def sprite(slug, cx, cy, w, h, visible, ghosts=()):
    if not wanted(slug):
        return
    frame_ortho(cam, cx, cy, w, h, PPU)
    render_pass(slug, visible, ghosts=ghosts)


cas_world = (CASSETTE[0], CASSETTE[1])
hub_l_world = (cas_world[0] - HUB_DX, cas_world[1] + HUB_DY)
# plate: body, screen glass, LED, collar, grille floor and the cassette's inside face
# The knob body never moves (only its mark turns), so it is baked into the plate with its
# real shadow; the separate knob sprite is only for the dock.
sprite("plate", 0, 0, CW, CD, PLATE_PARTS + [interior, knob])
# contact shadow of the whole device, on its own so it works on either theme
packs_hidden = [PACK_SPRITE]
shadow_ghosts = PLATE_PARTS + [o for o in mesh_children(cas) if o not in packs_hidden and o is not SHELL_CATCH] + [knob, KEY_UP]
sprite("shadow", 0, 0, CW, CD, [TABLE_CATCH], ghosts=shadow_ghosts)

pad = 0.12
sprite("shell-a", cas_world[0], cas_world[1], CAS_W + 2 * pad, CAS_D + 2 * pad,
       [o for o in FRONT] + [SHELL_CATCH])
if wanted("shell-b"):
    back.rotation_euler = (0, 0, 0)
    back.location = (0, 0, 0)
    front.rotation_euler = (0, math.pi, 0)
    front.location = (0, 0, 0.204)
    sprite("shell-b", cas_world[0], cas_world[1], CAS_W + 2 * pad, CAS_D + 2 * pad, list(BACK) + [SHELL_CATCH])
    front.rotation_euler, front.location = (0, 0, 0), (0, 0, 0)
    back.rotation_euler, back.location = (0, math.pi, 0), (0, 0, 0.204)
sprite("hub", hub_l_world[0], hub_l_world[1], 2 * HUB_R, 2 * HUB_R, HUB_L)
sprite("pack", hub_l_world[0], hub_l_world[1], 2 * PACK_MAX, 2 * PACK_MAX, [PACK_SPRITE])
sprite("knob", KNOB[0], KNOB[1], KNOB_SPRITE, KNOB_SPRITE, [knob, KNOB_CATCH])
sprite("knob-mark", KNOB[0], KNOB[1], KNOB_SPRITE, KNOB_SPRITE, [mark])
kx, ky = KEYS[0]
sprite("key-up", kx, ky, KEY_W + 2 * KEY_PAD, KEY_D + 2 * KEY_PAD, [KEY_UP, KEY_CATCH])
sprite("key-down", kx, ky, KEY_W + 2 * KEY_PAD, KEY_D + 2 * KEY_PAD, [KEY_DOWN, KEY_CATCH])
sprite("underside", 0, 0, CW, CD, UNDER_PARTS + [TABLE_CATCH])

# ---------------------------------------------------------------- beauty (3/4, social card, 404)
if wanted("beauty"):
    PACK_SPRITE.hide_render = True
    pl, pr = packs_at(0.3)
    keys_all = [KEY_UP]
    for i in range(1, 4):
        keys_all.append(key(f"Key{i}", *KEYS[i]))
    cd = bpy.data.cameras.new("Beauty")
    cd.lens = 58
    cd.dof.use_dof = True
    cd.dof.focus_distance = 12.6
    cd.dof.aperture_fstop = 5.6
    bc = link(bpy.data.objects.new("Beauty", cd))
    bc.location = (5.2, -10.2, 8.2)
    look_at(bc, (0.0, -0.15, 0.2))
    sc.camera = bc
    sc.render.resolution_x, sc.render.resolution_y = 2400, 1260
    floor = plane("Floor", 80, 80, (0, 0, -0.001))
    assign(floor, M["floor"])
    world_color("#E4E6E9", 0.8)
    vis = PLATE_PARTS + [interior] + FRONT + HUB_L + HUB_R_PARTS + [pl, pr, knob, mark] + keys_all + BEAUTY_ONLY + [floor]
    render_pass("beauty", vis, transparent=False)
    for o in (pl, pr, floor):
        o.hide_render = True
    world_color("#B9BDC3", 0.35)

# ---------------------------------------------------------------- flip frames
if wanted("flip"):
    PACK_SPRITE.hide_render = True
    pl, pr = packs_at(1.0)  # the end of side A: left reel empty, right reel full
    cas.location = (0, 0, 2.0)
    cd = bpy.data.cameras.new("Flip")
    cd.lens = 85
    fc = link(bpy.data.objects.new("Flip", cd))
    fc.location = (0, 0, 2.0 + 15.0)
    fc.rotation_euler = (0, 0, 0)
    sc.camera = fc
    sc.render.resolution_x, sc.render.resolution_y = 1200, 800
    visible = FRONT + BACK + HUB_L + HUB_R_PARTS + [pl, pr, wall]  # see-through, window to window
    for i in range(FLIP_FRAMES):
        t = i / (FLIP_FRAMES - 1)
        e = t * t * (3 - 2 * t)                 # smoothstep: settle at both ends
        cas.rotation_euler = (math.radians(9) * math.sin(math.pi * t), math.pi * e, math.radians(-4) * math.sin(2 * math.pi * t))
        cas.location = (0, 0, 2.0 + 1.6 * math.sin(math.pi * t))
        render_pass(f"flip-{i:02d}", visible)
    cas.rotation_euler, cas.location = (0, 0, 0), (CASSETTE[0], CASSETTE[1], FLOOR)

# ---------------------------------------------------------------- layout.json
def fx(x):
    return (x + CW / 2) / CW


def fy(y):
    return (CD / 2 - y) / CD


def rect(cx, cy, w, h):
    return {"x": fx(cx - w / 2), "y": fy(cy + h / 2), "w": w / CW, "h": h / CD}


def pt(x, y):
    return {"x": fx(x), "y": fy(y)}


layout = {
    "plate": {"width": round(CW * PPU), "height": round(CD * PPU)},
    "cassette": rect(cas_world[0], cas_world[1], CAS_W + 2 * pad, CAS_D + 2 * pad),
    "reels": {
        "left": pt(cas_world[0] - HUB_DX, cas_world[1] + HUB_DY),
        "right": pt(cas_world[0] + HUB_DX, cas_world[1] + HUB_DY),
        "hub": 2 * HUB_R / CW,
    },
    "pack": {"min": 2 * PACK_MIN / CW, "max": 2 * PACK_MAX / CW},
    "knob": {"centre": pt(*KNOB), "size": 2 * KNOB_R / CW, "sprite": KNOB_SPRITE / CW},
    "keys": [rect(x, y, KEY_W, KEY_D) for x, y in KEYS],
    "keyPad": {"x": KEY_PAD / CW, "y": KEY_PAD / CD},
    "keyLabels": [rect(x, KEY_Y - KEY_D / 2 - 0.25, KEY_W + KEY_GAP * 0.9, 0.24) for x, y in KEYS],
    "screen": rect(SCREEN[0], SCREEN[1], SCREEN[2] - 2 * SCREEN_INSET, SCREEN[3] - 2 * SCREEN_INSET),
    "window": rect(*WINDOW),
    "nameplate": rect(*NAMEPLATE),
    "led": pt(*LED),
    "underside": {
        "width": round(CW * PPU), "height": round(CD * PPU),
        "sticker": rect(STICKER[0], STICKER[1], STICKER[2] - 0.3, STICKER[3] - 0.3),
    },
    "flipFrames": FLIP_FRAMES,
    "flipSize": {"width": 1200, "height": 800},
}
path = os.path.join(ROOT, "public", "device", "layout.json")
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, "w") as f:
    json.dump(layout, f, indent=2)
print("WROTE", path)
