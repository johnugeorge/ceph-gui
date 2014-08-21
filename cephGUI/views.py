from django.utils.translation import ugettext as _
from api import CephClient
import json
import pdb
from django.http import HttpResponse
from django.shortcuts import redirect
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate
from django.http import HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt

from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout

from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
@login_required
def indexView(request):
    template_name = 'index.html'
    return render(request, template_name)

@csrf_exempt
def login(request):
	template_name = 'login.html'
	success_page="overview"
	if request.method == 'POST':
		username = request.POST['username']
		password = request.POST['password']
		user = authenticate(username=username, password=password)
		if user is not None:
			if user.is_active:
				auth_login(request, user)
				return HttpResponseRedirect(success_page)
			else:
				return render(request, template_name,{'msg':'User is disabled'})
		else:
			return render(request, template_name,{'msg':'Wrong Credentials'})
	if request.user.is_authenticated():
		return HttpResponseRedirect(success_page)
	else:
		return render(request, template_name,{'msg':'Please log in'})


def logOut(request):
	auth_logout(request)
	template_name = 'login.html'
	return render(request, template_name,"Please log in")

@login_required
def osdTree(request):
    template_name = 'ceph/_json.html'
    client = CephClient()
    context = dict()
    context['data'] = client.osd_tree()
    return render(request, template_name, {'status': context['status']})

@login_required
def view_rules(request):
	client = CephClient()
	

@login_required
def createRule(request):
	success_page = 'viewRules'
	client = CephClient()
	client.create_crush_rule(name=request.POST['name'],root=request.POST['root'],type=request.POST['type'],mode=request.POST['choose_mode'])
	return HttpResponseRedirect(success_page)

@csrf_exempt
@login_required
def deleteRule(request):
	success_page = 'viewRules'
	client = CephClient()
	client.delete_crush_rule(name=request.POST['name'])
	return True

@login_required
def view_rules(request):
	template_name = "crush_rule/view_rules.html"
	client = CephClient()
	rules = client.crush_rules()
	return render(request, template_name, {'rules': rules})

@login_required
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

@login_required
def overview(request):
    template_name = 'overview/_overview.html'
    client = CephClient()
    context = dict()
    context['status'] = client.status()
    return render(request, template_name, {'status': context['status']})

@login_required
def topology(request):
    template_name = 'topology/_topology.html'
    return render(request, template_name)

@login_required
def query(request):
    template_name = 'query/_query.html'
    return render(request, template_name)

