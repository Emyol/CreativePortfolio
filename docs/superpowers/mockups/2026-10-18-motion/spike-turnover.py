"""Throwaway spike: draft-render the footer turnover and a 48-frame flip from the real scene.

Runs art/blender/side-a/device.py's scene-building code unchanged except: renders go to the
scratch folder, only the flip pass of the original runs (at 48 frames), and the layout.json
write is skipped. Then a turnover pass is added: the whole device turns over onto its back.
"""
import sys, os, math
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
SIDE_A = os.path.join(REPO, "art", "blender", "side-a")
OUT = os.environ["SPIKE_OUT"] + os.sep  # where the PNG frames go
SAMPLES = os.environ.get("SPIKE_SAMPLES", "32")
FRAMES = int(os.environ.get("SPIKE_FRAMES", "48"))

sys.argv = [sys.argv[0], "--", "--only", "none" if os.environ.get("SPIKE_SKIP_FLIP") else "flip", "--samples", SAMPLES]
sys.path.insert(0, SIDE_A)
import common
common.OUT = OUT

src = open(os.path.join(SIDE_A, "device.py"), encoding="utf-8").read()
src = src.split("# ---------------------------------------------------------------- layout.json")[0]
assert "FLIP_FRAMES = 24" in src
src = src.replace("FLIP_FRAMES = 24", f"FLIP_FRAMES = {FRAMES}")
src = src.replace('render_pass(f"flip-{i:02d}", visible)', 'render_pass(f"flip48-{i:02d}", visible)')

turn_pass = r'''
# ---------------------------------------------------------------- SPIKE: the turnover
import mathutils
PACK_SPRITE.hide_render = True
tl_pack, tr_pack = packs_at(1.0)  # the end of side B's reading: a full right reel
keys_all = [KEY_UP] + [key(f"TKey{i}", *KEYS[i]) for i in range(1, 4)]
top_parts = PLATE_PARTS + [interior] + FRONT + HUB_L + HUB_R_PARTS + [tl_pack, tr_pack, knob, mark] + keys_all + BEAUTY_ONLY
# Recesses are boolean cuts by cutter objects that stay put in world space: bake every
# part's evaluated shape first, or turning the body slides the cuts off it.
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
for o in set(top_parts + list(UNDER_PARTS) + all_children(cas)):
    if o.type == "MESH" and len(o.modifiers):
        baked = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
        o.modifiers.clear()
        o.data = baked
# The underside parts were modelled face up for their own sprite; turn them onto the bottom
# face (180 deg about X through the body's mid-height), leaving out their duplicate slab.
flip_to_bottom = (mathutils.Matrix.Translation((0, 0, H / 2)) @ mathutils.Matrix.Rotation(math.pi, 4, "X")
                  @ mathutils.Matrix.Translation((0, 0, -H / 2)))
bottom_parts = [o for o in UNDER_PARTS if o is not under]  # `under` is a full-height slab: it would fill the top's recesses
for o in bottom_parts:
    o.matrix_world = flip_to_bottom @ o.matrix_world
# The body's own bottom shows shading from the top's cut-outs: cover it with a thin skin
# (not a full slab), and set the feet, sticker and door onto the skin.
SKIN = 0.02
skin = rrect("BottomSkin", W - 0.03, D - 0.03, SKIN, 0.40, (0, 0, -SKIN + 0.006), M["alu"], seg=16)
bevel(skin, 0.006, seg=2)
for o in bottom_parts:
    o.location.z -= SKIN - 0.006
bottom_parts.append(skin)
pivot = empty("TurnPivot", (0, 0, H / 2))
bpy.context.view_layer.update()
movers = top_parts + bottom_parts + [cas]
for o in movers:
    if o.parent is None or o is cas:
        mw = o.matrix_world.copy()
        o.parent = pivot
        o.matrix_world = mw
cd = bpy.data.cameras.new("Turn")
cd.lens = 70
tcam = link(bpy.data.objects.new("Turn", cd))
CAM_X = float(os.environ.get("SPIKE_CAMX", "0"))  # slid toward the shadow; x matched to the target so the view stays square
tcam.location = (CAM_X, -2.2, float(os.environ.get("SPIKE_CAMZ", "21.0")))  # further back: the whole shadow stays in frame
look_at(tcam, (CAM_X, 0, 0.6))
sc.camera = tcam
sc.render.resolution_x, sc.render.resolution_y = int(os.environ.get("SPIKE_W", "1200")), int(os.environ.get("SPIKE_H", "840"))
visible = top_parts + bottom_parts + [TABLE_CATCH]
visible = [o for o in visible if o.type in {"MESH", "FONT", "CURVE"}] + [o for o in all_children(cas) if o.type in {"MESH", "FONT", "CURVE"} and o is not SHELL_CATCH and o is not PACK_SPRITE]
if os.environ.get("SPIKE_DEBUG"):
    pivot.rotation_euler = (math.pi / 2, 0, 0)
    bpy.context.view_layer.update()
    for o in sorted(visible, key=lambda o: o.name):
        root = o
        while root.parent: root = root.parent
        print("DBG", o.name, "parent=", o.parent.name if o.parent else None, "root=", root.name, "z=%.2f" % o.matrix_world.translation.z, "mods=", [m.type for m in o.modifiers])
    raise SystemExit
for i in range(FLIP_FRAMES):
    t = i / (FLIP_FRAMES - 1)
    e = t * t * (3 - 2 * t)
    pivot.rotation_euler = (math.pi * e, math.radians(5) * math.sin(math.pi * t), math.radians(-3) * math.sin(2 * math.pi * t))
    pivot.location = (0, 0, H / 2 + float(os.environ.get("SPIKE_LIFT", "2.2")) * math.sin(math.pi * t))
    render_pass(f"turn-{i:02d}", visible)
print("SPIKE DONE")
'''
code = compile(src + turn_pass, os.path.join(SIDE_A, "device.py"), "exec")
exec(code, {"__file__": os.path.join(SIDE_A, "device.py"), "__name__": "__main__"})
