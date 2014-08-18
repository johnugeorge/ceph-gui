from django.utils.translation import ugettext as _
from api import CephClient
import json
import pdb
from django.http import HttpResponse
from django.shortcuts import redirect
from django.shortcuts import render

def indexView(request):
    template_name = 'index.html'
    return render(request, template_name)


def osdTree(request):
    template_name = 'ceph/_json.html'
    client = CephClient()
    context = dict()
    context['data'] = client.osd_tree()
    return render(request, template_name, {'status': context['status']})

def createRule(request):
    template_name = 'crush_rule/create.html'
    if request.method == 'POST':
	client = CephClient()
        client.create_crush_rule(name=request.POST['name'],root=request.POST['root'],type=request.POST['type'],mode=request.POST['choose_mode'])
        return redirect('/admin/ceph/?tab=ceph__CRUSHRule')
    else:
	return render(request, template_name)

def view_rules():
    template_name = "crush_rule/view_rules.html"
    client = CephClient()
    return client.crush_rules()


def jsonResponse(request):
    m = request.GET['m']
    client = CephClient()
    if m == 'tree':
        context = dict()
        context['data'] = client.osd_tree()
        if len(context['data']):
            data = context['data'][0]
    elif m == 'overview':
        data = client.pool_df(name=request.GET['name'], stats=request.GET['stats'])
		        
    elif m == 'query':
        #pdb.set_trace()
        dist = client.image_dist(pool=request.GET['pool'], id=request.GET['id'])
        data = {'pg' : [{'key': 'objects', 'values':[]}],
                'osd': [{'key': 'objects', 'values':[]}]}

        for pgid,value in dist['pg'].items():
            data['pg'][0]['values'].append({'x': pgid, 'y': value})
        for osdid,value in dist['osd'].items():
            data['osd'][0]['values'].append({'x': 'osd.'+osdid, 'y': value})
	

    return HttpResponse(json.dumps(data), content_type="application/json")


def overview(request):
    template_name = 'overview/_overview.html'
    client = CephClient()
    context = dict()
    context['status'] = client.status()
    return render(request, template_name, {'status': context['status']})

def topology(request):
    template_name = 'topology/_topology.html'
    return render(request, template_name)

def query(request):
    template_name = 'query/_query.html'
    return render(request, template_name)

