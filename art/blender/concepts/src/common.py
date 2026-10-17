"""Shared helpers for the concept renders.

Run from the repo root: blender -b --factory-startup -P art/blender/concepts/src/concept_a.py
"""
import bpy, math, os, sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
FONTS = os.path.join(ROOT, "art", "fonts") + os.sep
OUT = os.path.join(ROOT, "docs", "concepts", "2026-10-17") + os.sep
BLEND_OUT = os.path.join(ROOT, "art", "blender", "concepts") + os.sep


def hex_rgba(h, a=1.0):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, a)


def reset(name, w=1600, h=1000, samples=128):
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    sc = bpy.context.scene
    sc.name = name
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "OPTIX"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == "OPTIX"
    sc.cycles.device = "GPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 12
    sc.cycles.transmission_bounces = 12
    sc.cycles.glossy_bounces = 8
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Punchy"
    except TypeError:
        pass
    sc.render.image_settings.file_format = "PNG"
    world = bpy.data.worlds.new("World") if not bpy.data.worlds else bpy.data.worlds[0]
    sc.world = world
    world.use_nodes = True
    return sc


def world_color(hex_, strength=1.0):
    w = bpy.context.scene.world
    bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = hex_rgba(hex_)
    bg.inputs[1].default_value = strength


def principled(name, base="#ffffff", metallic=0.0, rough=0.5, transmission=0.0, ior=1.45,
               coat=0.0, coat_rough=0.03, sss=0.0, emission=None, emission_strength=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value = hex_rgba(base)
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Roughness"].default_value = rough
    p.inputs["Transmission Weight"].default_value = transmission
    p.inputs["IOR"].default_value = ior
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Coat Roughness"].default_value = coat_rough
    p.inputs["Subsurface Weight"].default_value = sss
    p.inputs["Alpha"].default_value = alpha
    if emission:
        p.inputs["Emission Color"].default_value = hex_rgba(emission)
        p.inputs["Emission Strength"].default_value = emission_strength
    return m


def assign(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)


def area_light(name, loc, target, size, power, color="#ffffff", shape="RECTANGLE", size_y=None):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = power
    ld.color = hex_rgba(color)[:3]
    ld.shape = shape
    ld.size = size
    if size_y:
        ld.size_y = size_y
    ob = bpy.data.objects.new(name, ld)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    look_at(ob, target)
    return ob


def look_at(ob, target):
    d = Vector(target) - Vector(ob.location)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def camera(loc, target, lens=50, ortho_scale=None, dof_target=None, fstop=2.8):
    cd = bpy.data.cameras.new("Cam")
    cd.lens = lens
    if ortho_scale:
        cd.type = "ORTHO"
        cd.ortho_scale = ortho_scale
    ob = bpy.data.objects.new("Cam", cd)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    look_at(ob, target)
    bpy.context.scene.camera = ob
    if dof_target is not None:
        cd.dof.use_dof = True
        cd.dof.focus_distance = (Vector(dof_target) - Vector(loc)).length
        cd.dof.aperture_fstop = fstop
    return ob


def text(body, font_file, size=1.0, extrude=0.1, bevel=0.0, bevel_res=4, align="CENTER", spacing=1.0):
    cu = bpy.data.curves.new(body, "FONT")
    cu.body = body
    cu.font = bpy.data.fonts.load(FONTS + font_file, check_existing=True)
    cu.size = size
    cu.extrude = extrude
    cu.bevel_depth = bevel
    cu.bevel_resolution = bevel_res
    cu.align_x = align
    cu.align_y = "CENTER"
    cu.space_character = spacing
    ob = bpy.data.objects.new(body, cu)
    bpy.context.collection.objects.link(ob)
    return ob


def to_mesh(ob):
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.view_layer.objects.active


def sweep(name, width=40, depth=30, height=20, radius=6, mat=None):
    """Seamless studio backdrop: floor that curves up into a back wall."""
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    prof = []
    for i in range(0, 11):
        prof.append((-depth / 2 + i * (depth - radius) / 10, 0.0))
    for i in range(1, 17):
        a = i / 16 * math.pi / 2
        prof.append((depth / 2 - radius + math.sin(a) * radius, radius - math.cos(a) * radius))
    for i in range(1, 6):
        prof.append((depth / 2, radius + i * (height - radius) / 5))
    rows = []
    for x in (-width / 2, width / 2):
        rows.append([bm.verts.new((x, y, z)) for (y, z) in prof])
    for i in range(len(prof) - 1):
        bm.faces.new((rows[0][i], rows[1][i], rows[1][i + 1], rows[0][i + 1]))
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    if mat:
        assign(ob, mat)
    return ob


def smooth(ob, angle=40):
    try:
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angle))
    except Exception:
        for p in ob.data.polygons:
            p.use_smooth = True


def render(slug):
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(BLEND_OUT, exist_ok=True)
    sc = bpy.context.scene
    sc.render.filepath = OUT + slug + ".png"
    bpy.ops.render.render(write_still=True)
    try:
        bpy.ops.file.pack_all()
    except Exception as e:
        print("pack failed", e)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT + slug + ".blend")
    print("RENDERED", sc.render.filepath)
