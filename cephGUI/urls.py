from django.conf.urls import patterns, include, url
from cephGUI.views import indexView,jsonResponse,createRule,overview,topology,query
from django.contrib import admin
from django.conf import settings
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'cephGUI.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),

    url(r'^admin/', include(admin.site.urls)),
    url(r'^$', indexView, name='index'),
    url(r'^overview$', overview, name='overview'),
    url(r'^topology$', topology, name='topology'),
    url(r'^query$', query, name='query'),
    url(r'^json$', jsonResponse, name='json'),
    url(r'^createCrushRule$', createRule, name='create_crush_rule'),	
)

if settings.DEBUG:
    import debug_toolbar
    urlpatterns += patterns('',
        url(r'^__debug__/', include(debug_toolbar.urls)),
	)
