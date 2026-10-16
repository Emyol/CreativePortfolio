"""Concept B, "Side A": the site is a pocket tape player Miel built; you operate it to read it."""
import sys
sys.path.insert(0, __import__("os").path.dirname(__file__))
import bpy, math
from common import *

sc = reset("B_SideA", samples=192)
sc.view_settings.exposure = -0.2
world_color("#CDD0D4", 0.3)

floor_mat = principled("Floor", "#C9CCD0", rough=0.8)
sweep("Sweep", width=80, depth=60, height=30, radius=10, mat=floor_mat)
bpy.data.objects["Sweep"].location = (0, 12, 0)


def rbox(name, size, loc, bevel=0.08, seg=8, mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bv = ob.modifiers.new("Bevel", "BEVEL")
    bv.width = bevel
    bv.segments = seg
    bv.limit_method = "ANGLE"
    for p in ob.data.polygons:
        p.use_smooth = True
    if mat:
        assign(ob, mat)
    return ob


def cut(target, cutter):
    b = target.modifiers.new("Cut", "BOOLEAN")
    b.operation = "DIFFERENCE"
    b.object = cutter
    target.modifiers.move(len(target.modifiers) - 1, 0)
    cutter.hide_render = True
    cutter.hide_viewport = True


alu = principled("Aluminium", "#D3D6DB", metallic=0.85, rough=0.32)
dark = principled("SmokedPlastic", "#DCE0E6", rough=0.03, transmission=1.0, ior=1.49)
black = principled("Bezel", "#121214", rough=0.4)
orange = principled("Signal", "#FF2E00", rough=0.35, coat=0.6, coat_rough=0.1)
grey_key = principled("Key", "#8E9298", rough=0.55)
white_plastic = principled("Hub", "#F1F1F0", rough=0.4)
tape = principled("Tape", "#2B1A12", rough=0.35, metallic=0.2)
ink = principled("Ink", "#141416", rough=0.6)
oled = principled("OLED", "#050506", rough=0.05)
glow_o = principled("OLEDText", "#000000", emission="#FF5A1F", emission_strength=9)
glow_w = principled("OLEDTextW", "#000000", emission="#F4F4F4", emission_strength=6)

W, D, H = 7.2, 4.9, 0.62
body = rbox("Body", (W, D, H), (0, 0, H / 2), bevel=0.22, seg=10, mat=alu)

# cassette window, left side
win_c = rbox("WinCut", (3.5, 2.5, 0.5), (-1.55, 0.6, H), bevel=0.15)
cut(body, win_c)
rbox("WindowFloor", (3.4, 2.4, 0.04), (-1.55, 0.6, H - 0.22), bevel=0.05, mat=white_plastic)
for i, x in enumerate((-2.45, -0.65)):
    r = 0.95 if i == 0 else 0.6  # side A has more tape left on the first reel
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=0.06, location=(x, 0.6, H - 0.17), vertices=96)
    assign(bpy.context.active_object, tape)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.34, depth=0.09, location=(x, 0.6, H - 0.14), vertices=64)
    assign(bpy.context.active_object, white_plastic)
    for k in range(6):
        a = k * math.pi / 3
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x + math.cos(a) * 0.19, 0.6 + math.sin(a) * 0.19, H - 0.09))
        t = bpy.context.active_object
        t.scale = (0.12, 0.05, 0.05)
        t.rotation_euler.z = a
        assign(t, black)
rbox("WindowGlass", (3.42, 2.42, 0.03), (-1.55, 0.6, H - 0.04), bevel=0.04, mat=dark)

# screen, right top
scr_c = rbox("ScrCut", (2.6, 1.05, 0.3), (2.05, 1.25, H), bevel=0.06)
cut(body, scr_c)
rbox("Screen", (2.55, 1.0, 0.03), (2.05, 1.25, H - 0.07), bevel=0.03, mat=oled)
for body_txt, font, size, loc, mat in [
    ("SIDE A", "SpaceMono-Bold.ttf", 0.30, (1.0, 1.42, H - 0.05), glow_o),
    ("01  about", "SpaceMono-Regular.ttf", 0.2, (1.0, 1.06, H - 0.05), glow_w),
]:
    t = text(body_txt, font, size=size, extrude=0.0, align="LEFT")
    t.location = loc
    assign(t, mat)
# progress bar on the screen
rbox("Progress", (1.9, 0.035, 0.01), (2.02, 0.85, H - 0.05), bevel=0.0, seg=1, mat=glow_w)
rbox("ProgressHead", (0.5, 0.06, 0.012), (1.32, 0.85, H - 0.045), bevel=0.0, seg=1, mat=glow_o)

# the knob
bpy.ops.mesh.primitive_cylinder_add(radius=0.62, depth=0.42, location=(1.55, -0.55, H + 0.21), vertices=96)
knob = bpy.context.active_object
bv = knob.modifiers.new("Bevel", "BEVEL"); bv.width = 0.06; bv.segments = 6; bv.limit_method = "ANGLE"
for p in knob.data.polygons: p.use_smooth = True
assign(knob, orange)
rbox("KnobMark", (0.07, 0.36, 0.02), (1.55, -0.3, H + 0.425), bevel=0.02, seg=3, mat=white_plastic)

# four keys with labels
labels = ["about", "events", "music", "people"]
for i, lab in enumerate(labels):
    x = -2.9 + i * 1.12
    rbox("Key_" + lab, (0.92, 0.62, 0.22), (x, -1.75, H + 0.06), bevel=0.1, seg=6, mat=grey_key)
    t = text(lab, "SpaceMono-Regular.ttf", size=0.17, extrude=0.0, align="CENTER")
    t.location = (x, -2.25, H + 0.002)
    assign(t, ink)
for x in (2.75, 3.15):  # two small buttons
    bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.12, location=(x, -0.55, H + 0.04), vertices=48)
    assign(bpy.context.active_object, black)

t = text("miel  model 01", "SpaceMono-Bold.ttf", size=0.2, extrude=0.0, align="LEFT")
t.location = (-3.3, 2.05, H + 0.002)
assign(t, ink)
area_light("Key", (-5, -6, 9), (0, 0, 0), 6, 2200)
area_light("Rim", (6, 7, 5), (0, 0, 0.3), 4, 1300, "#EEF2FF")
area_light("Fill", (7, -6, 3), (0, 0, 0.3), 6, 300)
area_light("Backdrop", (0, -2, 10), (0, 18, 6), 14, 1600)

camera((5.5, -10.5, 8.5), (0.2, -0.1, 0.2), lens=58, dof_target=(0.3, -0.3, 0.6), fstop=5.0)
render("B-side-a-hero")
