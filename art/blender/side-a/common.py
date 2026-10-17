"""Shared helpers for the Side A device renders.

Started from art/blender/concepts/src/common.py. Adds rounded-rectangle prisms, collection
booleans and render_pass(), which renders one layer of the device on a transparent film.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
FONTS = os.path.join(ROOT, "art", "fonts") + os.sep
OUT = os.path.join(ROOT, "art", "blender", "side-a", "out") + os.sep


def args():
    """Options after `--`: --only plate,hub  --samples 64"""
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    opts = {"only": None, "samples": 128}
    for i, a in enumerate(argv):
        if a == "--only":
            opts["only"] = set(argv[i + 1].split(","))
        if a == "--samples":
            opts["samples"] = int(argv[i + 1])
    return opts


def hex_rgba(h, a=1.0):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, a)


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def reset(name, samples=128):
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    sc = bpy.context.scene
    sc.name = name
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "OPTIX"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = d.type == "OPTIX"
        sc.cycles.device = "GPU"
    except TypeError:
        sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 10
    sc.cycles.glossy_bounces = 6
    sc.cycles.transmission_bounces = 8
    sc.render.resolution_percentage = 100
    # Product colours must survive the view transform: the knob has to read as the
    # site's --signal. PBR Neutral keeps base colours; AgX would wash them out.
    for vt in ("Khronos PBR Neutral", "Standard"):
        try:
            sc.view_settings.view_transform = vt
            break
        except TypeError:
            continue
    sc.view_settings.look = "None"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    world = bpy.data.worlds[0] if bpy.data.worlds else bpy.data.worlds.new("World")
    sc.world = world
    world.use_nodes = True
    return sc


def world_color(hex_, strength=1.0):
    w = bpy.context.scene.world
    bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = hex_rgba(hex_)
    bg.inputs[1].default_value = strength


def principled(name, base="#ffffff", metallic=0.0, rough=0.5, transmission=0.0, ior=1.45,
               coat=0.0, coat_rough=0.03, emission=None, emission_strength=0.0, aniso=0.0):
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
    p.inputs["Anisotropic"].default_value = aniso
    if emission:
        p.inputs["Emission Color"].default_value = hex_rgba(emission)
        p.inputs["Emission Strength"].default_value = emission_strength
    return m


def bsdf(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def assign(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    return ob


def area_light(name, loc, target, size, power, color="#ffffff", size_y=None):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = power
    ld.color = hex_rgba(color)[:3]
    ld.shape = "RECTANGLE"
    ld.size = size
    ld.size_y = size_y or size
    ob = link(bpy.data.objects.new(name, ld))
    ob.location = loc
    look_at(ob, target)
    return ob


def look_at(ob, target):
    d = Vector(target) - Vector(ob.location)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def rrect_points(w, d, r, seg=10):
    r = max(0.0, min(r, w / 2 - 1e-4, d / 2 - 1e-4))
    if r == 0:
        return [(w / 2, d / 2), (-w / 2, d / 2), (-w / 2, -d / 2), (w / 2, -d / 2)]
    pts = []
    for cx, cy, a0 in ((w / 2 - r, d / 2 - r, 0), (-w / 2 + r, d / 2 - r, 90),
                       (-w / 2 + r, -d / 2 + r, 180), (w / 2 - r, -d / 2 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def prism(name, pts, h, loc=(0, 0, 0), mat=None):
    """Extrude a CCW polygon in XY upward by h. loc is (x, y, bottom z)."""
    bm = bmesh.new()
    bot = [bm.verts.new((x, y, 0)) for x, y in pts]
    top = [bm.verts.new((x, y, h)) for x, y in pts]
    bm.faces.new(top)
    bm.faces.new(list(reversed(bot)))
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me))
    ob.location = loc
    if mat:
        assign(ob, mat)
    return ob


def rrect(name, w, d, h, r, loc=(0, 0, 0), mat=None, seg=10):
    return prism(name, rrect_points(w, d, r, seg), h, loc, mat)


def disc(name, radius, h, loc=(0, 0, 0), mat=None, seg=128):
    pts = [(radius * math.cos(2 * math.pi * i / seg), radius * math.sin(2 * math.pi * i / seg)) for i in range(seg)]
    return prism(name, pts, h, loc, mat)


def plane(name, w, d, loc, catcher=False, r=0.0):
    ob = prism(name, rrect_points(w, d, r), 0.0005, loc)
    ob.is_shadow_catcher = catcher
    return ob


def bevel(ob, width, seg=4, angle=35):
    b = ob.modifiers.new("Bevel", "BEVEL")
    b.width = width
    b.segments = seg
    b.limit_method = "ANGLE"
    b.angle_limit = math.radians(angle)
    return b


def cut(target, cutters, name="Cut"):
    """Boolean-subtract every cutter, before any bevel so cut edges get rounded too."""
    col = bpy.data.collections.new(target.name + name)
    bpy.context.scene.collection.children.link(col)
    for c in cutters:
        for uc in list(c.users_collection):
            uc.objects.unlink(c)
        col.objects.link(c)
        c.hide_render = True
    col.hide_render = True
    b = target.modifiers.new(name, "BOOLEAN")
    b.operation = "DIFFERENCE"
    b.operand_type = "COLLECTION"
    b.collection = col
    b.solver = "EXACT"
    target.modifiers.move(len(target.modifiers) - 1, 0)
    return col


def smooth(ob, angle=40):
    """Smooth shading that keeps big flat faces flat (weighted normals): booleans leave
    long thin triangles on the top face, and plain smoothing streaks them."""
    for p in ob.data.polygons:
        p.use_smooth = True
    wn = ob.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL")
    wn.mode = "FACE_AREA"
    wn.weight = 100
    wn.keep_sharp = True
    return ob


def text(body, font_file, size=1.0, align="CENTER", spacing=1.0, extrude=0.0):
    cu = bpy.data.curves.new(body, "FONT")
    cu.body = body
    cu.font = bpy.data.fonts.load(FONTS + font_file, check_existing=True)
    cu.size = size
    cu.extrude = extrude
    cu.align_x = align
    cu.align_y = "CENTER"
    cu.space_character = spacing
    return link(bpy.data.objects.new(body, cu))


def ortho_camera(name="Cam"):
    cd = bpy.data.cameras.new(name)
    cd.type = "ORTHO"
    ob = link(bpy.data.objects.new(name, cd))
    ob.rotation_euler = (0, 0, 0)  # looks down -Z; image up is +Y
    return ob


def frame_ortho(cam, cx, cy, w_units, h_units, ppu, z=30.0):
    """Fit an orthographic camera to a w x h region at `ppu` pixels per unit, exactly."""
    sc = bpy.context.scene
    px_w, px_h = max(1, round(w_units * ppu)), max(1, round(h_units * ppu))
    sc.render.resolution_x, sc.render.resolution_y = px_w, px_h
    cam.data.sensor_fit = "AUTO"
    cam.data.ortho_scale = max(px_w, px_h) / ppu
    cam.location = (cx, cy, z)
    cam.rotation_euler = (0, 0, 0)
    sc.camera = cam
    return px_w, px_h


def render_pass(slug, objects_visible, transparent=True, ghosts=()):
    """Render only `objects_visible` (plus lights). `ghosts` cast shadows but are not seen."""
    sc = bpy.context.scene
    keep = set(objects_visible) | set(ghosts)
    for ob in sc.objects:
        if ob.type in {"LIGHT", "CAMERA", "EMPTY"}:
            continue
        if any(c.hide_render for c in ob.users_collection if c != sc.collection):
            continue  # boolean cutters
        ob.hide_render = ob not in keep
        ob.visible_camera = ob not in ghosts
    sc.render.film_transparent = transparent
    try:
        sc.cycles.film_transparent_glass = transparent
    except AttributeError:
        pass
    os.makedirs(OUT, exist_ok=True)
    sc.render.filepath = OUT + slug + ".png"
    bpy.ops.render.render(write_still=True)
    print("RENDERED", slug, sc.render.resolution_x, "x", sc.render.resolution_y)
