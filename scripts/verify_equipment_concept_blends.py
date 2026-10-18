"""Independent saved .blend reopen check, run inside Blender with --python-exit-code 1."""
import json
from pathlib import Path
import bpy
from mathutils import Vector

root=Path(__file__).resolve().parent.parent/'tools/equipment-editor/concepts'
recipe=json.loads((root/'recipes.json').read_text(encoding='utf-8'))
for model in recipe['models']:
    bpy.ops.wm.open_mainfile(filepath=str(root/(model['id']+'.blend')))
    parent=bpy.data.objects[model['id']]
    assert parent['basis']=='assumed'
    assert parent['isCertifiedTechnologicalCapacity'] is False
    parts=[o for o in parent.children if o.type=='MESH']
    points=[o.matrix_world@Vector(p) for o in parts for p in o.bound_box]
    actual=[(max(p[i] for p in points)-min(p[i] for p in points))*1000 for i in range(3)]
    assert all(abs(actual[i]-model[k])<.1 for i,k in enumerate(['widthMm','lengthMm','heightMm']))
    assert abs(min(p.z for p in points))<1e-6
    assert bpy.context.scene.unit_settings.scale_length==1
    print('BLEND_REOPEN_PASS',model['id'],actual)
