import requests
import json

from django.conf import settings

class CephClient():
    def __init__(self):
        self._session = requests.Session()

    def request(self, method, url, params=None):
        try:
            resp = self._session.request(method,
                                         url,
                                         params=params,
                                         headers={'Accept': 'application/json',
                                                  'Content-Type': 
                                                    'application/json',})
            if not resp.ok:
                raise Exception('connection error')
            resp_json = json.loads(resp.text)
            if resp_json['status'] != 'OK':
                raise Exception('command error')
            return resp_json['output'] 
        except Exception:
            return {}

    def send_command(self, method, cmd, params=None):
        ceph_url = "172.29.86.27"
        if not ceph_url.startswith("http://"):
            ceph_url = "http://" + ceph_url
        url = "%s:5000/api/v0.1/" % ceph_url
        url += '/'.join(cmd)
        return self.request(method, url, params)

    def status(self):
        return self.send_command('GET', ['status'])

    def osd_tree(self):
        osds = self.send_command('GET', ['osd', 'topology'])
        if not osds:
            return {}
        nodes = osds['nodes']
        osd_dic = dict()
        for node in nodes:
            osd_dic[node['id']] = node
            node['cid'] = node['id']
            del node['id']
            node['is_root'] = True

        for node in nodes:
            if node.has_key('children'):
                children = list()
                for child in node['children']:
                    children.append(osd_dic[child])
                    osd_dic[child]['is_root'] = False
                node['children'] = children

        osd_tree = list()
        for node in nodes:
            if node['is_root'] == True:
                osd_tree.append(node)
        return osd_tree

    def crush_rules(self):
        rules = self.send_command('GET', ['osd', 'crush', 'rule', 'dump'])
        for rule in rules:
            step_item = []
            for step in rule['steps']:
                if step['op'] == 'take':
                    step_item.append("take %s" % step['item_name'])
                elif step['op'] == 'chooseleaf_firstn':
                    step_item.append("chooseleaf_firstn %d %s" % (step['num'], step['type']))
                else:
                    step_item.append("emit")
            rule['steps'] = step_item
        return rules

    def create_crush_rule(self, name, root, type, mode):
        result = self.send_command('PUT', ['osd', 'crush', 'rule', 'create-simple'],
                                    params={'name' : name,
                                            'root' : root,
                                            'type' : type,
                                            'mode' : mode})
        return result 

    def pool_df(self, name, stats):
        return self.send_command('GET', ['osd', 'pool', 'df'], 
                                 params={'name' : name, 'stats' : stats})

    def image_dist(self, pool, id):
        return self.send_command('GET', ['image', 'map'],
                                 params={'pool' : pool, 'id' : id})
