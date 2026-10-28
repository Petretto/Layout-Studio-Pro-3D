"""Run in installed Blender, headless. Original generic meshes; no third-party assets.
blender --background --factory-startup --python scripts/build_equipment_concepts.py
Geometry coordinates in metres, Z up; glTF export converts to glTF Y up.
"""
import json
import math
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'tools/equipment-editor/concepts'
RECIPE = json.loads((OUT / 'recipes.json').read_text(encoding='utf-8'))

def material(name, color, metal=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    if hasattr(mat, 'use_nodes'):
        try:
            mat.use_nodes = True
        except Exception:
            pass
    if mat.node_tree:
        node = mat.node_tree.nodes.get('Principled BSDF')
        if node:
            node.inputs['Base Color'].default_value = (*color, 1)
            node.inputs['Metallic'].default_value = metal
            node.inputs['Roughness'].default_value = .45
    return mat

def box(name, size, position, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    parts.append(obj)
    return obj

def cylinder(name, radius, depth, position, rotation, mat, vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=position, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    parts.append(obj)
    return obj

def bin_box(name, w, d, h, x, y, z, mat):
    t = min(w, d, h) * .08
    box(name + '_base', (w, d, t), (x, y, z+t/2), mat)
    for side in [-1, 1]:
        box(name + '_side', (t, d, h), (x+side*(w-t)/2, y, z+h/2), mat)
    box(name + '_back', (w, t, h), (x, y-(d-t)/2, z+h/2), mat)
    box(name + '_front_lip', (w, t, h*.35), (x, y+(d-t)/2, z+h*.175), mat)

def build(model):
    w, d, h = [model[k]/1000 for k in ['widthMm', 'lengthMm', 'heightMm']]
    fam = model['family']
    if fam == 'bench':
        top = model['worktopHeightMm']/1000
        box('Worktop', (w, d, .04), (0, 0, top-.02), wood)
        for x in [-w*.44, w*.44]:
            for y in [-d*.40, d*.40]:
                box('Leg', (.055, .055, top-.04), (x, y, (top-.04)/2), steel)
        box('Lower_crossmember', (w*.9, .04, .055), (0, -d*.4, top*.26), steel)
        for x in [-w*.45, w*.45]:
            box('Upright', (.045, .045, h-top), (x, -d*.42, (h+top)/2), steel)
        box('Light_bridge', (w*.94, .12, .04), (0, -d*.35, h-.02), steel)
        box('Light_diffuser', (w*.82, .08, .012), (0, -d*.33, h-.046), light)
        box('Shelf', (w*.88, d*.32, .025), (0, -d*.24, h*.73), wood)
        box('Tool_panel', (w*.70, .025, h*.16), (0, -d*.41, h*.59), dark)
        for i in range(9):
            box('Tool_hook', (.012, .06, .025), (-w*.30+i*w*.075, -d*.36, h*.59), steel)
        box('Cabinet', (w*.27, d*.72, top*.6), (w*.27, 0, top*.51), dark)
        for i in range(3):
            z = top*.30+i*top*.18
            box('Drawer', (w*.24, .025, top*.14), (w*.27, d*.373, z), blue)
            box('Drawer_handle', (w*.12, .035, .018), (w*.27, d*.4, z), steel)
        for i in range(4):
            bin_box('Small_bin', w*.11, d*.22, .09, -w*.32+i*w*.14, -d*.1, top, blue)

    elif fam == 'cart':
        r = h*.075
        for x in [-w*.40, w*.40]:
            for y in [-d*.35, d*.35]:
                cylinder('Wheel', r, w*.045, (x, y, r), (0, math.pi/2, 0), dark, vertices=20)
                box('Wheel_fork', (.035, .035, r*1.5), (x, y, r*1.5), steel)
        for z in [h*.22, h*.50, h*.78]:
            box('Shelf_deck', (w, d, h*.025), (0, 0, z), wood)
            box('Shelf_back_lip', (w, .025, h*.055), (0, -d/2+.0125, z+h*.035), blue)
        for x in [-w*.44, w*.44]:
            for y in [-d*.40, d*.40]:
                box('Post', (.04, .04, h*.65), (x, y, h*.49), steel)
            box('Handle_post', (.035, .035, h*.35), (x, -d*.40, h*.825), steel)
        box('Push_handle', (w*.91, .04, .03), (0, -d*.40, h-.015), blue)

    elif fam == 'rack':
        for x in [-w/2+.025, w/2-.025]:
            box('Upright', (.05, .05, h), (x, -d*.30, h/2), steel)
            box('Foot', (.05, d, .04), (x, 0, .02), steel)
        box('Back_panel', (w, .02, h*.89), (0, -d/2+.01, h*.5), dark)
        for row in range(4):
            z=h*.12+row*h*.22
            box('Bin_rail', (w*.95, .035, .04), (0, -d*.20, z), steel)
            for col in range(4):
                bin_box('Parts_bin', w*.205, d*.73, h*.15, -w*.345+col*w*.23, d*.08, z, blue if row%2 else lightblue)

    elif fam == 'shelving-rack':
        # 1000 x 300 x 2500 mm, 5 shelves
        up = 0.035
        for sx in [-1, 1]:
            for sy in [-1, 1]:
                x = sx * (w/2 - up/2)
                y = sy * (d/2 - up/2)
                box('Upright', (up, up, h), (x, y, h/2), galvanized)
                box('Foot', (up, up, 0.005), (x, y, 0.0025), dark)
        z_levels = [0.15, 0.70, 1.25, 1.80, 2.35]
        for idx, z in enumerate(z_levels):
            box(f'Shelf_{idx}', (w, d, 0.025), (0, 0, z), galvanized)
            box(f'ShelfStiffener_{idx}', (w*0.9, 0.015, 0.02), (0, 0, z - 0.0175), dark)

    elif fam == 'pallet-rack-single':
        # 2870 x 1100 x 4500 mm, bay 2700 mm
        col_w, col_d = 0.085, 0.08
        for sx in [-1, 1]:
            fx = sx * (w/2 - col_w/2)
            for sy in [-1, 1]:
                fy = sy * (d/2 - col_d/2)
                box('Post', (col_w, col_d, h), (fx, fy, h/2), rack_blue)
                box('Footplate', (col_w, col_d, 0.015), (fx, fy, 0.0075), galvanized)
            inner_d = d - 2*col_d
            for bz in [0.2, 1.6, 3.0, 4.4]:
                box('Frame_Horiz_Brace', (0.025, inner_d, 0.03), (fx, 0, bz), rack_blue)
            for bz, sign in [(0.9, 1), (2.3, -1), (3.7, 1)]:
                box('Frame_Diag_Brace', (0.02, inner_d, 0.02), (fx, 0, bz), rack_blue)
        beam_span = w - 2*col_w
        beam_h, beam_t = 0.12, 0.05
        for bz in [1.40, 2.80, 4.20]:
            box('Beam_Front', (beam_span, beam_t, beam_h), (0, d/2 - col_d + beam_t/2, bz - beam_h/2), orange)
            box('Beam_Rear', (beam_span, beam_t, beam_h), (0, -d/2 + col_d - beam_t/2, bz - beam_h/2), orange)
            for sx in [-1, 1]:
                cx = sx * (beam_span/2 - 0.02)
                box('Connector_F', (0.04, beam_t*1.2, beam_h*1.15), (cx, d/2 - col_d + beam_t/2, bz - beam_h/2), orange)
                box('Connector_R', (0.04, beam_t*1.2, beam_h*1.15), (cx, -d/2 + col_d - beam_t/2, bz - beam_h/2), orange)
        box('CrossBrace_1', (beam_span*0.95, 0.01, 0.02), (0, -d/2 + col_d*0.5, 2.1), galvanized)
        box('CrossBrace_2', (beam_span*0.95, 0.01, 0.02), (0, -d/2 + col_d*0.5, 2.1), galvanized)

    elif fam == 'pallet-rack-double':
        # 5655 x 1100 x 4500 mm, 2 bays of 2700 mm
        col_w, col_d = 0.085, 0.08
        beam_span = 2.70
        frame_xs = [-w/2 + col_w/2, 0, w/2 - col_w/2]
        for fx in frame_xs:
            for sy in [-1, 1]:
                fy = sy * (d/2 - col_d/2)
                box('Post', (col_w, col_d, h), (fx, fy, h/2), rack_blue)
                box('Footplate', (col_w, col_d, 0.015), (fx, fy, 0.0075), galvanized)
            inner_d = d - 2*col_d
            for bz in [0.2, 1.6, 3.0, 4.4]:
                box('Frame_Horiz_Brace', (0.025, inner_d, 0.03), (fx, 0, bz), rack_blue)
            for bz, sign in [(0.9, 1), (2.3, -1), (3.7, 1)]:
                box('Frame_Diag_Brace', (0.02, inner_d, 0.02), (fx, 0, bz), rack_blue)
        beam_h, beam_t = 0.12, 0.05
        bay_centers = [-beam_span/2 - col_w/2, beam_span/2 + col_w/2]
        for bx in bay_centers:
            for bz in [1.40, 2.80, 4.20]:
                box('Beam_Front', (beam_span, beam_t, beam_h), (bx, d/2 - col_d + beam_t/2, bz - beam_h/2), orange)
                box('Beam_Rear', (beam_span, beam_t, beam_h), (bx, -d/2 + col_d - beam_t/2, bz - beam_h/2), orange)

    elif fam == 'industrial-module':
        # 1200 x 800 x 1400 mm
        tube = 0.06
        for sx in [-1, 1]:
            for sy in [-1, 1]:
                x = sx * (w/2 - tube/2)
                y = sy * (d/2 - tube/2)
                box('Column', (tube, tube, h), (x, y, h/2), dark)
                box('LevelingFoot', (tube, tube, 0.02), (x, y, 0.01), galvanized)
                box('LiftingEye', (tube*0.8, tube*0.8, 0.03), (x, y, h - 0.015), steel)
        for sy in [-1, 1]:
            box('BaseX', (w - 2*tube, tube, tube), (0, sy*(d/2 - tube/2), tube/2), dark)
            box('TopX', (w - 2*tube, tube, tube), (0, sy*(d/2 - tube/2), h - tube/2), dark)
        for sx in [-1, 1]:
            box('BaseY', (tube, d - 2*tube, tube), (sx*(w/2 - tube/2), 0, tube/2), dark)
            box('TopY', (tube, d - 2*tube, tube), (sx*(w/2 - tube/2), 0, h - tube/2), dark)
        box('BasePlate', (w - 2*tube, d - 2*tube, 0.015), (0, 0, tube + 0.0075), galvanized)
        box('RearPlate', (w - 2*tube, 0.012, h*0.6), (0, -d/2 + tube/2 + 0.01, h*0.55), steel)
        box('InternalShelf', (w*0.8, d*0.7, 0.02), (0, 0, h*0.45), steel)

    elif fam == 'power-subassembly':
        # 500 x 350 x 250 mm
        box('BasePlate', (w, d, 0.015), (0, 0, 0.0075), alum)
        hs_w, hs_d, hs_h = w*0.48, d*0.85, h - 0.015
        hs_x = -w/2 + hs_w/2 + 0.02
        box('HeatSinkBase', (hs_w, hs_d, 0.02), (hs_x, 0, 0.015 + 0.01), alum)
        num_fins = 8
        fin_pitch = (hs_w - 0.01) / num_fins
        for fi in range(num_fins):
            fx = hs_x - hs_w/2 + 0.005 + fi * fin_pitch
            box(f'Fin_{fi}', (0.004, hs_d, hs_h), (fx, 0, 0.015 + hs_h/2), alum)
        tf_w, tf_d, tf_h = w*0.38, d*0.65, h*0.75
        tf_x = w/2 - tf_w/2 - 0.04
        box('TransformerCore', (tf_w, tf_d, tf_h), (tf_x, -d*0.08, 0.015 + tf_h/2), dark)
        box('CopperCoil', (tf_w*0.75, tf_d*0.75, tf_h*0.65), (tf_x, -d*0.08, 0.015 + tf_h/2), copper)
        box('ConnectorBlock', (w*0.35, d*0.2, h*0.4), (tf_x, d/2 - d*0.15, 0.015 + h*0.2), orange)
        for ci in range(4):
            cylinder(f'Pin_{ci}', 0.008, 0.025, (tf_x - 0.05 + ci*0.035, d/2 - 0.02, 0.015 + h*0.2), (math.pi/2, 0, 0), steel)

    elif fam == 'drive-subassembly':
        # 450 x 300 x 280 mm
        box('MountingBracket', (w, d, 0.02), (0, 0, 0.01), steel)
        motor_dia = h*0.68
        motor_len = d*0.65
        cylinder('ServoMotor', motor_dia/2, motor_len, (-w*0.12, -d/2 + motor_len/2 + 0.03, 0.02 + motor_dia/2), (math.pi/2, 0, 0), blue)
        gb_dia = motor_dia*0.88
        gb_len = d*0.22
        cylinder('Gearbox', gb_dia/2, gb_len, (-w*0.12, 0.05, 0.02 + motor_dia/2), (math.pi/2, 0, 0), alum)
        shaft_dia = 0.04
        shaft_len = d/2 - 0.05 - gb_len/2
        cylinder('OutputShaft', shaft_dia/2, shaft_len, (-w*0.12, d/2 - shaft_len/2, 0.02 + motor_dia/2), (math.pi/2, 0, 0), steel)
        box('EncoderCover', (w*0.25, 0.04, h*0.5), (-w*0.12, -d/2 + 0.02, 0.02 + motor_dia/2), dark)
        box('SideFlange', (w*0.28, d*0.8, h), (w/2 - w*0.14, 0, h/2), steel)

    elif fam == 'assembly-fixture':
        # 600 x 400 x 300 mm
        plate_t = 0.04
        box('ToolingPlate', (w, d, plate_t), (0, 0, plate_t/2), steel)
        vb_w, vb_d, vb_h = w*0.22, d*0.35, 0.09
        for vx in [-w*0.22, w*0.22]:
            box('VBlockBase', (vb_w, vb_d, vb_h), (vx, 0, plate_t + vb_h/2), galvanized)
        for cx in [-w*0.38, w*0.38]:
            box('ClampBase', (0.06, 0.06, 0.08), (cx, 0, plate_t + 0.04), steel)
            box('ClampArm', (0.03, 0.12, 0.02), (cx + (0.04 if cx<0 else -0.04), 0, plate_t + 0.1), steel)
            cylinder('HandleGrip', 0.015, h - plate_t - 0.08, (cx, -0.03, plate_t + 0.08 + (h - plate_t - 0.08)/2), (0, 0, 0), red)
        for lx in [-w*0.42, w*0.42]:
            for ly in [-d*0.42, d*0.42]:
                cylinder('LocatorPin', 0.012, 0.03, (lx, ly, plate_t + 0.015), (0, 0, 0), galvanized)

def point_at(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z', 'Y').to_euler()

reports = []
for model in RECIPE['models']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    if hasattr(bpy.context.preferences.filepaths, 'save_preview_images'):
        bpy.context.preferences.filepaths.save_preview_images = False
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1
    scene.unit_settings.length_unit = 'MILLIMETERS'

    steel = material('Original_blue_frame', (.075, .22, .30), .6)
    blue = material('Original_accent', (.08, .48, .65), .15)
    lightblue = material('Original_bins', (.25, .60, .68), .1)
    dark = material('Graphite', (.075, .09, .105), .15)
    wood = material('Neutral_surface', (.65, .56, .39))
    light = material('Light_diffuser', (.90, .94, .95))
    rack_blue = material('Frame_blue', (.06, .35, .65), .25)
    orange = material('Beam_orange', (.95, .38, .05), .2)
    galvanized = material('Galvanized_steel', (.75, .78, .80), .5)
    red = material('Clamp_red', (.85, .15, .10), .1)
    copper = material('Copper_winding', (.80, .45, .25), .4)
    alum = material('Aluminum_surface', (.82, .84, .86), .7)

    parts = []
    build(model)
    root = bpy.data.objects.new(model['id'], None)
    scene.collection.objects.link(root)
    root['basis'] = 'assumed'
    root['notes'] = RECIPE['dimensionSource']
    root['inspiration_url'] = model['referenceUrl']
    root['isCertifiedTechnologicalCapacity'] = False
    for obj in parts:
        obj.parent = root
    bpy.context.view_layer.update()

    vertices = [o.matrix_world @ Vector(corner) for o in parts for corner in o.bound_box]
    low = [min(v[i] for v in vertices) for i in range(3)]
    high = [max(v[i] for v in vertices) for i in range(3)]
    dims = [(high[i]-low[i])*1000 for i in range(3)]
    expected = [model[k] for k in ['widthMm', 'lengthMm', 'heightMm']]

    assert all(abs(a-b)<.1 for a,b in zip(dims,expected)), (model['id'], dims, expected)
    assert abs(low[2])<1e-6, ('Floor contact', low)
    assert abs(low[0] + high[0])<1e-6, ('Centered X', low[0], high[0])
    assert abs(low[1] + high[1])<1e-6, ('Centered Y', low[1], high[1])

    triangles = 0
    for obj in parts:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    assert triangles <= model['triangleBudget'], (triangles, model['triangleBudget'])

    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(OUT/(model['id']+'.glb')), export_format='GLB', use_selection=True, export_extras=True, export_yup=True)

    # Studio is not part of the selected GLB geometry
    max_d = max(expected)/1000
    cam_pos = (max_d * 1.5, max_d * 2.0, max_d * 1.4 + model['heightMm']/2000)
    bpy.ops.object.camera_add(location=cam_pos)
    camera = bpy.context.object
    point_at(camera, (0, 0, model['heightMm']/2000))
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = max_d * 1.65
    scene.camera = camera

    for pos, power, size in [((max_d, max_d, max_d*2), 650, 4), ((-max_d*1.5, max_d*0.5, max_d), 450, 3), ((0, -max_d*1.5, max_d*1.5), 600, 3)]:
        bpy.ops.object.light_add(type='AREA', location=pos)
        lamp = bpy.context.object
        lamp.data.energy = power
        lamp.data.shape = 'DISK'
        lamp.data.size = size
        point_at(lamp, (0, 0, model['heightMm']/2000))

    scene.world = bpy.data.worlds.new('Studio')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.88, .92, .96, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .45
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 16
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(OUT/(model['id']+'.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(model['id']+'.blend')))
    bpy.ops.render.render(write_still=True)

    reports.append({
        'id': model['id'],
        'basis': 'assumed',
        'dimensionsMm': dims,
        'floorZMm': low[2]*1000,
        'triangles': triangles,
        'triangleBudget': model['triangleBudget'],
        'meshObjects': len(parts),
        'glbBytes': (OUT/(model['id']+'.glb')).stat().st_size,
        'blendBytes': (OUT/(model['id']+'.blend')).stat().st_size
    })

(OUT/'verification.json').write_text(json.dumps({'blenderVersion': bpy.app.version_string, 'models': reports}, indent=2), encoding='utf-8')
print('CONCEPTS_PASS', json.dumps(reports))
