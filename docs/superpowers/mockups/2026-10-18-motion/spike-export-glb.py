"""Throwaway spike: export the real Side A device as a GLB for a real-time 3D hero.

Builds the scene from art/blender/side-a/device.py unchanged (no passes rendered, no
layout.json written), bakes every boolean cut, adds pivots for the parts the page moves,
and writes one GLB. Node names the page relies on: Key0..Key3, KnobMarkPivot, HubLPivot,
HubRPivot, PackL, PackR, Cassette, OLEDGlass, LEDLens.
"""
import sys, os, math
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
SIDE_A = os.path.join(REPO, "art", "blender", "side-a")
OUT = os.environ["SPIKE_GLB"]

sys.argv = [sys.argv[0], "--", "--only", "none", "--samples", "8"]
sys.path.insert(0, SIDE_A)
import common
common.OUT = os.path.dirname(OUT) + os.sep

src = open(os.path.join(SIDE_A, "device.py"), encoding="utf-8").read()
src = src.split("# ---------------------------------------------------------------- layout.json")[0]

export = r'''
import mathutils
PACK_SPRITE.hide_render = True
keys = [KEY_UP] + [key(f"Key{i}", *KEYS[i]) for i in range(1, 4)]
KEY_UP.name = "Key0"
pl = pack("PackL", -HUB_DX, PACK_MAX)
pr = pack("PackR", HUB_DX, PACK_MAX)
bpy.context.view_layer.update()

def keep_world(o, parent):
    mw = o.matrix_world.copy()
    o.parent = parent
    o.matrix_world = mw

# pivots for the parts that turn
hub_l = empty("HubLPivot", (-HUB_DX, HUB_DY, 0.065), parent=cas)
hub_r = empty("HubRPivot", (HUB_DX, HUB_DY, 0.065), parent=cas)
pivot_mark = empty("KnobMarkPivot", (KNOB[0], KNOB[1], H))
bpy.context.view_layer.update()
for p in HUB_L: keep_world(p, hub_l)
for p in HUB_R_PARTS: keep_world(p, hub_r)
keep_world(mark, pivot_mark)

# key labels and the nameplate as meshes (the screen's text stays live in the page)
labels = []
dg = bpy.context.evaluated_depsgraph_get()
for t in BEAUTY_ONLY:
    if t.type == "FONT" and t.data.body in ("miel", "about", "events", "mixtape", "people"):
        me = bpy.data.meshes.new_from_object(t.evaluated_get(dg))
        o = bpy.data.objects.new("Print_" + t.data.body, me)
        bpy.context.scene.collection.objects.link(o)
        o.matrix_world = t.matrix_world.copy()
        labels.append(o)

parts = PLATE_PARTS + [interior, knob] + FRONT + HUB_L + HUB_R_PARTS + [pl, pr, mark] + keys + labels + [wall]
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
for o in set(parts):
    if o.type == "MESH" and len(o.modifiers):
        baked = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
        o.modifiers.clear()
        o.data = baked

def ancestors(o):
    out = []
    while o.parent:
        o = o.parent
        out.append(o)
    return out

select = set(parts)
for o in list(select):
    select.update(ancestors(o))
bpy.ops.object.select_all(action="DESELECT")
for o in select:
    o.hide_set(False)
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format="GLB", use_selection=True, export_apply=False,
                          export_yup=True, export_cameras=False, export_lights=False, export_materials="EXPORT")
print("EXPORTED", OUT_GLB, len(select), "objects")
for name in sorted({o.active_material.name for o in parts if getattr(o, "active_material", None)}):
    print("MATERIAL", name)
'''
code = compile(src + export, os.path.join(SIDE_A, "device.py"), "exec")
exec(code, {"__file__": os.path.join(SIDE_A, "device.py"), "__name__": "__main__", "OUT_GLB": OUT})
