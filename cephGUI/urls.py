from django.conf.urls import patterns, include, url
from cephGUI.views import indexView,jsonResponse,createRule,deleteRule,overview,topology,query,login,logOut,view_rules
from django.contrib import admin
from django.conf import settings
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'cephGUI.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),

    url(r'^admin/', include(admin.site.urls)),
    url(r'^$', overview, name='index'),
    url(r'^login$', login, name='login'),
    url(r'^logout$', logOut, name='logout'),
    url(r'^overview$', overview, name='overview'),
    url(r'^viewRules$', view_rules, name='view_rules'),
    url(r'^topology$', topology, name='topology'),
    url(r'^query$', query, name='query'),
    url(r'^json$', jsonResponse, name='json'),
    url(r'^createCrushRule$', createRule, name='create_crush_rule'),	
    url(r'^deleteCrushRule$', deleteRule, name='delete_crush_rule'),	
)

if settings.DEBUG:
    import debug_toolbar
    urlpatterns += patterns('',
        url(r'^__debug__/', include(debug_toolbar.urls)),
	)
