"""Concept C, "Photocopy": the site is a riso-printed zine of things Miel went to and people he met."""
import sys
sys.path.insert(0, __import__("os").path.dirname(__file__))
import bpy, bmesh, math, random
from common import *

random.seed(7)
sc = reset("C_Photocopy", samples=160)
sc.view_settings.exposure = 0.45
world_color("#202022", 0.2)

PINK, BLUE, PAPER = "#FF3EA5", "#1E5BFF", "#F3F3F0"


def paper_mat(name, base=PAPER):
    m = principled(name, base, rough=0.9, sss=0.05)
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 180
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.06
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    return m


def halftone_mat(name, ink_hex, paper_hex=PAPER, cells=70.0, seed_scale=2.2):
    """Riso halftone: a dot grid whose dot size follows an abstract tone field (placeholder, not a photo)."""
    m = paper_mat(name, paper_hex)
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sc_ = nt.nodes.new("ShaderNodeVectorMath"); sc_.operation = "SCALE"; sc_.inputs["Scale"].default_value = cells
    nt.links.new(tc.outputs["UV"], sc_.inputs[0])
    fr = nt.nodes.new("ShaderNodeVectorMath"); fr.operation = "FRACTION"
    nt.links.new(sc_.outputs[0], fr.inputs[0])
    sub = nt.nodes.new("ShaderNodeVectorMath"); sub.operation = "SUBTRACT"; sub.inputs[1].default_value = (0.5, 0.5, 0)
    nt.links.new(fr.outputs[0], sub.inputs[0])
    ln = nt.nodes.new("ShaderNodeVectorMath"); ln.operation = "LENGTH"
    nt.links.new(sub.outputs[0], ln.inputs[0])
    tone = nt.nodes.new("ShaderNodeTexNoise"); tone.inputs["Scale"].default_value = seed_scale
    tone.inputs["Detail"].default_value = 3
    nt.links.new(tc.outputs["UV"], tone.inputs["Vector"])
    rad = nt.nodes.new("ShaderNodeMapRange")
    rad.inputs["From Min"].default_value = 0.35; rad.inputs["From Max"].default_value = 0.65
    rad.inputs["To Min"].default_value = 0.05; rad.inputs["To Max"].default_value = 0.62
    nt.links.new(tone.outputs["Fac"], rad.inputs["Value"])
    cmp = nt.nodes.new("ShaderNodeMath"); cmp.operation = "LESS_THAN"
    nt.links.new(ln.outputs["Value"], cmp.inputs[0])
    nt.links.new(rad.outputs["Result"], cmp.inputs[1])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs["A"].default_value = hex_rgba(paper_hex)
    mix.inputs["B"].default_value = hex_rgba(ink_hex)
    nt.links.new(cmp.outputs["Value"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], p.inputs["Base Color"])
    return m


def sheet(name, w, h, loc, rot=0.0, mat=None, torn=(), z=0.0, wrinkle=0.012):
    """A sheet of paper; edges listed in `torn` ("t","b","l","r") get a ragged tear."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    nx, ny = 60, max(8, int(60 * h / w))
    verts = []
    for j in range(ny + 1):
        row = []
        for i in range(nx + 1):
            x = -w / 2 + w * i / nx
            y = -h / 2 + h * j / ny
            if "t" in torn and j == ny: y -= random.uniform(0, 0.09)
            if "b" in torn and j == 0: y += random.uniform(0, 0.09)
            if "l" in torn and i == 0: x += random.uniform(0, 0.09)
            if "r" in torn and i == nx: x -= random.uniform(0, 0.09)
            row.append(bm.verts.new((x, y, 0)))
        verts.append(row)
    uv = bm.loops.layers.uv.new()
    for j in range(ny):
        for i in range(nx):
            f = bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
            for loop, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                loop[uv].uv = (a / nx, b / ny)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.location = (loc[0], loc[1], z)
    ob.rotation_euler.z = math.radians(rot)
    tex = bpy.data.textures.new(name + "_wr", "CLOUDS"); tex.noise_scale = 0.6
    d = ob.modifiers.new("Wrinkle", "DISPLACE"); d.texture = tex; d.strength = wrinkle
    s = ob.modifiers.new("Thick", "SOLIDIFY"); s.thickness = 0.004
    for p in me.polygons: p.use_smooth = True
    if mat: assign(ob, mat)
    return ob


def ink_text(body, font, size, loc, rot, hex_, z):
    t = text(body, font, size=size, extrude=0.0, align="LEFT")
    t.location = (loc[0], loc[1], z)
    t.rotation_euler.z = math.radians(rot)
    m = principled("Ink_" + body[:6], hex_, rough=0.85)
    assign(t, m)
    t.visible_shadow = False
    return t


# table
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.01))
assign(bpy.context.active_object, principled("Table", "#1C1C1E", rough=0.7))

# the zine spread: two pages
sheet("PageL", 5.0, 7.0, (-2.52, 0), rot=0.6, mat=paper_mat("PaperL"), z=0.0)
sheet("PageR", 5.0, 7.0, (2.52, 0.05), rot=0.6, mat=paper_mat("PaperR"), z=0.0)
# left page: the name, overprinted in two inks with a slight misregistration
ink_text("MIEL", "Anton-Regular.ttf", 4.0, (-3.05, 3.2), -89.4, PINK, 0.0095)
ink_text("MIEL", "Anton-Regular.ttf", 4.0, (-2.99, 3.24), -89.4, BLUE, 0.0100)
ink_text("things i went to,", "SpaceMono-Bold.ttf", 0.24, (-4.6, -2.75), 0.6, BLUE, 0.013)
ink_text("people i met.", "SpaceMono-Bold.ttf", 0.24, (-4.6, -3.1), 0.6, BLUE, 0.013)

sheet("PinkBlock", 3.2, 3.6, (-2.2, 0.6), rot=0.6, mat=halftone_mat("HalftonePink", PINK, cells=55.0, seed_scale=1.4), z=0.008, wrinkle=0.0)
# right page: halftone photo slot taped down
sheet("Photo", 3.6, 4.3, (2.45, 0.9), rot=-3.0, mat=halftone_mat("Halftone", BLUE), z=0.02, wrinkle=0.006)
tape = principled("Tape", "#E9E4C9", rough=0.55, alpha=0.82)
sheet("Tape1", 1.5, 0.45, (0.85, 2.95), rot=32, mat=tape, torn=("l", "r"), z=0.035, wrinkle=0.004)
sheet("Tape2", 1.5, 0.45, (4.1, -1.15), rot=28, mat=tape, torn=("l", "r"), z=0.035, wrinkle=0.004)
ink_text("[ your photo here ]", "SpaceMono-Regular.ttf", 0.2, (1.1, -1.85), -3.0, "#1A1A1A", 0.013)

# ticket stub and a torn scrap, off the spread
sheet("Ticket", 2.8, 1.15, (6.4, -2.6), rot=-14, mat=paper_mat("TicketPaper", PINK), torn=("r",), z=0.006)
ink_text("ADMIT ONE", "Anton-Regular.ttf", 0.55, (5.25, -2.6), -14, "#141414", 0.018)
ink_text("no. 001", "SpaceMono-Bold.ttf", 0.18, (5.3, -3.0), -14, "#141414", 0.018)
sheet("Scrap", 2.2, 1.0, (-6.3, 2.9), rot=9, mat=paper_mat("ScrapPaper", "#E9ECF2"), torn=("t", "r", "b"), z=0.004)
ink_text("music  /  events  /  people", "SpaceMono-Regular.ttf", 0.13, (-7.15, 2.85), 9, BLUE, 0.016)

area_light("Key", (-9, -6, 9), (0, 0, 0), 4, 3400)
area_light("Fill", (8, 6, 10), (0, 0, 0), 10, 500)
camera((0.3, -0.6, 30), (0.3, -0.1, 0), ortho_scale=17.5)
bpy.context.scene.camera.rotation_euler = (0, 0, 0)
render("C-photocopy-hero")
