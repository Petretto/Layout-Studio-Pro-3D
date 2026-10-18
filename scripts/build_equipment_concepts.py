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
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
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

def bin_box(name, w, d, h, x, y, z, mat):
    t = min(w, d, h) * .08
    box(name + '_base', (w, d, t), (x, y, z+t/2), mat)
    for side in [-1, 1]:
        box(name + '_side', (t, d, h), (x+side*(w-t)/2, y, z+h/2), mat)
    box(name + '_back', (w, t, h), (x, y-(d-t)/2, z+h/2), mat)
    box(name + '_front_lip', (w, t, h*.35), (x, y+(d-t)/2, z+h*.175), mat)

def build(model):
    w, d, h = [model[k]/1000 for k in ['widthMm', 'lengthMm', 'heightMm']]
    if model['family'] == 'bench':
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
    elif model['family'] == 'cart':
        r = h*.075
        for x in [-w*.40, w*.40]:
            for y in [-d*.35, d*.35]:
                bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=r, depth=w*.045, location=(x, y, r), rotation=(0, math.pi/2, 0))
                obj=bpy.context.object;obj.name='Wheel';obj.data.materials.append(dark);parts.append(obj)
                box('Wheel_fork', (.035, .035, r*1.5), (x, y, r*1.5), steel)
        for z in [h*.22, h*.50, h*.78]:
            box('Shelf_deck', (w, d, h*.025), (0, 0, z), wood)
            box('Shelf_back_lip', (w, .025, h*.055), (0, -d/2+.0125, z+h*.035), blue)
        for x in [-w*.44, w*.44]:
            for y in [-d*.40, d*.40]:
                box('Post', (.04, .04, h*.65), (x, y, h*.49), steel)
            box('Handle_post', (.035, .035, h*.35), (x, -d*.40, h*.825), steel)
        box('Push_handle', (w*.91, .04, .03), (0, -d*.40, h-.015), blue)
    else:
        for x in [-w/2+.025, w/2-.025]:
            box('Upright', (.05, .05, h), (x, -d*.30, h/2), steel)
            box('Foot', (.05, d, .04), (x, 0, .02), steel)
        box('Back_panel', (w, .02, h*.89), (0, -d/2+.01, h*.5), dark)
        for row in range(4):
            z=h*.12+row*h*.22
            box('Bin_rail', (w*.95, .035, .04), (0, -d*.20, z), steel)
            for col in range(4):
                bin_box('Parts_bin', w*.205, d*.73, h*.15, -w*.345+col*w*.23, d*.08, z, blue if row%2 else lightblue)

def point_at(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z', 'Y').to_euler()

reports=[]
for model in RECIPE['models']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version=0
    if hasattr(bpy.context.preferences.filepaths, 'save_preview_images'):
        bpy.context.preferences.filepaths.save_preview_images=False
    scene=bpy.context.scene
    scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1;scene.unit_settings.length_unit='MILLIMETERS'
    steel=material('Original_blue_frame',(.075,.22,.30),.6)
    blue=material('Original_accent',(.08,.48,.65),.15)
    lightblue=material('Original_bins',(.25,.60,.68),.1)
    dark=material('Graphite',(.075,.09,.105),.15)
    wood=material('Neutral_surface',(.65,.56,.39))
    light=material('Light_diffuser',(.90,.94,.95))
    parts=[];build(model)
    root=bpy.data.objects.new(model['id'],None);scene.collection.objects.link(root)
    root['basis']='assumed';root['notes']=RECIPE['dimensionSource'];root['inspiration_url']=model['referenceUrl'];root['isCertifiedTechnologicalCapacity']=False
    for obj in parts:obj.parent=root
    bpy.context.view_layer.update()
    vertices=[o.matrix_world @ Vector(corner) for o in parts for corner in o.bound_box]
    low=[min(v[i] for v in vertices) for i in range(3)]
    high=[max(v[i] for v in vertices) for i in range(3)]
    dims=[(high[i]-low[i])*1000 for i in range(3)]
    expected=[model[k] for k in ['widthMm','lengthMm','heightMm']]
    assert all(abs(a-b)<.1 for a,b in zip(dims,expected)), (model['id'],dims,expected)
    assert abs(low[2])<1e-6, ('Floor contact',low)
    triangles=0
    for obj in parts:obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
    assert triangles<=model['triangleBudget'], (triangles,model['triangleBudget'])
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for obj in parts:obj.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(OUT/(model['id']+'.glb')),export_format='GLB',use_selection=True,export_extras=True,export_yup=True)
    # Studio is not part of the selected GLB geometry.
    bpy.ops.object.camera_add(location=(3.1,4.2,3.0))
    camera=bpy.context.object;point_at(camera,(0,0,model['heightMm']/2000));camera.data.type='ORTHO';camera.data.ortho_scale=max(expected)/1000*1.65;scene.camera=camera
    for pos,power,size in [((2,2,4),650,4),((-3,1,2),450,3),((0,-3,3),600,3)]:
        bpy.ops.object.light_add(type='AREA', location=pos);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size;point_at(lamp,(0,0,.7))
    scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.88,.92,.96,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16
    scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/(model['id']+'.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(model['id']+'.blend')))
    bpy.ops.render.render(write_still=True)
    reports.append({'id':model['id'],'basis':'assumed','dimensionsMm':dims,'floorZMm':low[2]*1000,'triangles':triangles,'triangleBudget':model['triangleBudget'],'meshObjects':len(parts),'glbBytes':(OUT/(model['id']+'.glb')).stat().st_size,'blendBytes':(OUT/(model['id']+'.blend')).stat().st_size})
(OUT/'verification.json').write_text(json.dumps({'blenderVersion':bpy.app.version_string,'models':reports},indent=2),encoding='utf-8')
print('CONCEPTS_PASS', json.dumps(reports))
