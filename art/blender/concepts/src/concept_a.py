"""Concept A, "Specimen": the name as four real objects, one material each."""
import sys
sys.path.insert(0, __import__("os").path.dirname(__file__))
import bpy, math
from common import *

sc = reset("A_Specimen", samples=192)
sc.view_settings.exposure = -0.35
world_color("#D9DADD", 0.25)

paper = principled("Backdrop", "#ECEDF0", rough=0.9)
sweep("Sweep", width=60, depth=40, height=25, radius=8, mat=paper)
bpy.data.objects["Sweep"].location = (0, 7, 0)

spec = [  # letter, extrude, bevel: the E is puffed into a pillow, the others are crisp
    ("M", 0.30, 0.05),
    ("I", 0.30, 0.05),
    ("E", 0.26, 0.04),
    ("L", 0.30, 0.05),
]
letters = []
x = 0.0
GAP = 0.42
for ch, ext, bev in spec:
    ob = text(ch, "ArchivoBlack-Regular.ttf", size=3.2, extrude=ext, bevel=bev, bevel_res=8, align="LEFT")
    ob.rotation_euler = (math.radians(90), 0, 0)
    ob = to_mesh(ob)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    ob.location.x = x
    bpy.context.view_layer.update()
    x += ob.dimensions.x + GAP
    letters.append(ob)
for ob in letters:
    ob.location.x -= (x - GAP) / 2

velvet = principled("BlackVelvet", "#161618", rough=0.85)
pv = next(n for n in velvet.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
pv.inputs["Sheen Weight"].default_value = 1.0
pv.inputs["Sheen Roughness"].default_value = 0.35
mats = [
    principled("Chrome", "#E4E6EB", metallic=1.0, rough=0.04),
    principled("Glass", "#F7F9FF", transmission=1.0, rough=0.0, ior=1.5),
    principled("SignalVinyl", "#FF2200", rough=0.38, coat=1.0, coat_rough=0.02),
    velvet,
]
for i, (ob, m) in enumerate(zip(letters, mats)):
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    assign(ob, m)
    smooth(ob, 30)
    if ob.name.startswith("E"):  # inflate: remesh, round every edge, push out along normals
        rm = ob.modifiers.new("Remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.03
        sm = ob.modifiers.new("Smooth", "SMOOTH"); sm.factor = 1.0; sm.iterations = 30
        dp = ob.modifiers.new("Inflate", "DISPLACE"); dp.strength = 0.07; dp.mid_level = 0.0
        sb = ob.modifiers.new("Soft", "SUBSURF"); sb.levels = 1; sb.render_levels = 1
        bpy.ops.object.convert(target="MESH")
        for p_ in ob.data.polygons: p_.use_smooth = True
        bpy.context.view_layer.update()
    ob.location.z = ob.dimensions.z / 2
    ob.rotation_euler.z = math.radians([-7, 4, -3, 8][i])
    print(ob.name, tuple(round(d, 2) for d in ob.dimensions))

# reflection strips for the chrome and glass: seen in reflections, not by the camera
glow = principled("Strip", "#000000", emission="#FFFFFF", emission_strength=6)
for i, (loc, rot) in enumerate([((-7, -9, 3.5), 35), ((8, -7, 3), -40), ((0, -12, 7), 0)]):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    st = bpy.context.active_object
    st.scale = (1.2, 7, 1)
    look_at(st, (0, 0, 1.4))
    st.rotation_euler.rotate_axis("Z", math.radians(rot))
    assign(st, glow)
    st.visible_camera = False
    st.visible_shadow = False

area_light("Key", (-6, -6, 8), (0, 0, 1.2), 5, 1500)
area_light("Rim", (6, 7, 6), (0, 0, 1.2), 3, 1200, "#EEF2FF")
area_light("Fill", (8, -7, 1.5), (0, 0, 1.2), 6, 260)
area_light("Backdrop", (0, -2, 9), (0, 14, 6), 12, 1800)
area_light("VelvetRim", (9, 3, 2.5), (3.2, 0, 1.0), 2, 500)

camera((1.6, -16.5, 2.3), (0.1, 0, 1.15), lens=55, dof_target=(0.9, -0.4, 1.1), fstop=6.3)
render("A-specimen-hero")
