function overview_chart(){
    ctypes = $("form.chart-series input:checkbox");
    req = [];
    for(i=0;i<ctypes.length;i++)
        if(ctypes[i].checked)
            req.push(ctypes[i].value);
    url = "json?m=overview&name=volumes&stats=" + req.join(',')
    d3.json(url, function(error, poolData) {
        nv.addGraph(function() {
          var chart = nv.models.lineWithFocusChart();

          chart.xAxis
            .tickFormat(function(d){return d3.time.format('%H:%M')(new Date(d * 1000));});

          chart.x2Axis
            .tickFormat(function(d){return d3.time.format('%H:%M')(new Date(d * 1000));});

          chart.yAxis
            .tickFormat(d3.format(',.2f'));

          chart.y2Axis
            .tickFormat(d3.format(',.2f'));

          d3.select('#my-chart svg')
            .datum(poolData)
            .transition().duration(500)
            .call(chart)
            ;

          nv.utils.windowResize(chart.update);

          return chart;
        });
    });
}
$(overview_chart());
$('.chart-series').submit(function(event){
    event.preventDefault(); 
    overview_chart()
});

var hostOSD={};
var current_osd = '';

treeJSON = d3.json("json?m=tree", function(error, treeData) {

    // Calculate total nodes, max label length
    var totalNodes = 0;
    var maxLabelLength = 0;
    // Misc. variables
    var i = 0;
    var duration = 750;
    var root;

    // size of the diagram
    var viewerWidth = 1130;
    //var viewerHeight = $('.tab-content').height();
    var viewerHeight = 500;

    var tree = d3.layout.tree()
        .size([viewerHeight, viewerWidth]);

    // define a d3 diagonal projection for use by the node paths later on.
    var diagonal = d3.svg.diagonal()
        .projection(function(d) {
            return [d.y, d.x];
        });

    // A recursive helper function for performing some setup by walking through all nodes

    function visit(parent, visitFn, childrenFn) {
        if (!parent) return;

        visitFn(parent);

        var children = childrenFn(parent);
        if (children) {
            var count = children.length;
            for (var i = 0; i < count; i++) {
                visit(children[i], visitFn, childrenFn);
            }
        }
    }

    // Call visit function to establish maxLabelLength
    visit(treeData, function(d) {
        totalNodes++;
        maxLabelLength = Math.max(d.name.length, maxLabelLength);
        if(d.type_id == 0) {
            if(hostOSD[d.address])
                hostOSD[d.address].push(d.cid);
            else
                hostOSD[d.address] = [d.cid];
            osdIo[d.cid] = 0;
        }
    }, function(d) {
        return d.children && d.children.length > 0 ? d.children : null;
    });


    // sort the tree according to the node names

    function sortTree() {
        tree.sort(function(a, b) {
            return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
        });
    }
    // Sort the tree initially incase the JSON isn't in a sorted order.
    sortTree();

    // Define the zoom function for the zoomable tree
    function zoom() {
        $('svg .osd').popover('hide')
        svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    // define the baseSvg, attaching a class for styling and the zoomListener
    var baseSvg = d3.select("#tree-container").append("svg")
        .attr("width", viewerWidth)
        .attr("height", viewerHeight)
        .attr("class", "overlay")
        .call(zoomListener);

    // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

    function centerNode(source) {
        scale = zoomListener.scale();
        x = -source.y0;
        y = -source.x0;
        x = x * scale + viewerWidth / 2 ;
        y = y * scale + viewerHeight / 2;
        d3.select('g').transition()
            .duration(duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        zoomListener.scale(scale);
        zoomListener.translate([x, y]);
    }

    // Toggle children function

    function toggleChildren(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        return d;
    }

    // Toggle children on click.

    function click(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        if(d.type == 'osd') {
            if(current_osd == d.cid) {
                $('svg #osd'+d.cid).popover('hide');
                current_osd = '';
                return;
            }

            current_osd = d.cid
            var url = "http://"+d.address+":5000/api/v0.1/osd/host?id="+d.cid;
            $('#osd'+d.cid).popover('show');
            $.ajax(url).done(function(x){
                $("#osdpopovertitle").html(d.name)
                var content = JSON.parse(x);
                content = content['output']

                $("#osdpopoverright").html("CPU: <span class='label label-"+ getClassForPercentage(content['cpu_percent']) + "'>" + content['cpu_percent'] + "</span>")

                var diskpercent = (content['disk']['used'] / content['disk']['total']) * 100

                var diskval = formatSizeUnits(content['disk']['used'])
                var disktotal = formatSizeUnits(content['disk']['total'])

                var mempercent = (content['memory']['used'] / content['memory']['total']) * 100

                var memval = formatSizeUnits(content['memory']['used'])
                var memtotal = formatSizeUnits(content['memory']['total'])

                var text = "Disk: " + diskval + " / " + disktotal + "<div class='progress'><div class='bar' style='width: " + diskpercent + "%'></div></div>";
                text += "Mem: " + memval + " / " + memtotal + "<div class='progress'><div class='bar' style='width: " + mempercent + "%'></div></div>";

                text += "<ul class='unstyled'><li>#PG:" + content['numpg'] + "</li><li>#Primary PG:" + content['numpg_primary'] + "</li><li>Primary Affinity:" + content['primary-affinity'] + "</li></ul>";
                $("#osdpopover").html(text);
            });
            return;
        }
        d = toggleChildren(d);
        update(d);
        centerNode(d);
    }
    
    function getClassForPercentage(percent) {
        if (percent < 60) {return "success"}
        else if (percent < 85) {return "warning"}
        else {return "danger"}
    }

    function formatSizeUnits(bytes){
      if      (bytes>=1073741824) {bytes=(bytes/1073741824).toFixed(2)+' GB';}
      else if (bytes>=1048576)    {bytes=(bytes/1048576).toFixed(2)+' MB';}
      else if (bytes>=1024)       {bytes=(bytes/1024).toFixed(2)+' KB';}
      else if (bytes>1)           {bytes=bytes+' bytes';}
      else if (bytes==1)          {bytes=bytes+' byte';}
      else                        {bytes='0 byte';}
      return bytes;
    }

    function update(source) {
        // Compute the new height, function counts total children of root node and sets tree height accordingly.
        // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
        // This makes the layout more consistent.
        var levelWidth = [1];
        var childCount = function(level, n) {

            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);

                levelWidth[level + 1] += n.children.length;
                n.children.forEach(function(d) {
                    childCount(level + 1, d);
                });
            }
        };
        childCount(0, root);
        var newHeight = d3.max(levelWidth) * 45; // 25 pixels per line  
        tree = tree.size([newHeight, viewerWidth]);

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Set widths between levels based on maxLabelLength.
        nodes.forEach(function(d) {
            d.y = (d.depth * (maxLabelLength * 10)); //maxLabelLength * 10px
            // alternatively to keep a fixed scale one can set a fixed depth per level
            // Normalize for fixed-depth by commenting out below line
            // d.y = (d.depth * 500); //500px per level.
        });

        // Update the nodes…
        node = svgGroup.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", function(d) {return d.type_id == 0 ? "node osdNode" + d.cid : "node" })
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', click);

        nodeEnter.append('path')
        nodeEnter.append('path')
        nodeEnter.append("circle")
            .attr('id', function(d) {return 'osd'+d.cid})
            .attr('class', function(d) { if (d.type_id == 0) {return 'nodeCircle osd'} else {return "nodeCircle"}  })
            .attr("r", 0)
            .style("fill", function(d) {
                if(d.type_id == 0)
                    return "lightsteelblue";
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeEnter.append("text")
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("dy", ".35em")
            .attr('class', 'nodeText')
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            })
            .style("fill-opacity", 0);

        // Update the text to reflect whether node has children or not.
        node.select('text')
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            });

        // Change the circle fill depending on whether it has children and is collapsed
        node.select("circle.nodeCircle")
            .attr("r", 4.5)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            })
            .style("stroke", function(d){
                if (d.type_id == 0) { 
                    if (d.status == "up") {
                        if (d.exists == 1) { return '#5cb85c'}  
                        else {return '#f0ad4e'}
                    }
                    else {return '#d9534f'}
                }
                else {return "steelblue"}
            });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Fade the text in
        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 0);

        nodeExit.select("text")
            .style("fill-opacity", 0);

        // Update the links…
        var link = svgGroup.selectAll("path.link")
            .data(links, function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
        //osdNode = svgGroup.selectAll("g.osdNode");
        $('svg .osd').popover({
            'placement' : 'right',
            'class': 'popoveroffset',
            'trigger' : 'manual',
            'html' : true,
            'title' : "<div id='osdpopoverright' style='float: right'></div><div id='osdpopovertitle'></div>",
            'content': "<div id='osdpopover' style='width: 245px;height:152px;'></div>"
        })
    }

    // Append a group which holds all nodes and which the zoom Listener can act upon.
    svgGroup = baseSvg.append("g");

    // Define the root
    root = treeData;
    root.x0 = viewerHeight / 2;
    root.y0 = viewerWidth / 2;

    // Layout the tree initially and center on the root node.
    update(root);
    centerNode(root);
});

var pie = d3.layout.pie().sort(null);
var arc = d3.svg.arc().innerRadius(5).outerRadius(10);

var checkTick;
var checkIntv = 10000;

var osdIo={};

function pullIo(){
    var color = d3.scale.linear().domain([0, 2000]).range(['white','red']);

    for(host in hostOSD)
    {
        var url = 'http://' + host + ':5000/api/v0.1/osd/iostat?id=' + hostOSD[host].join(',');
        $.getJSON(url, function(data){
            data=data['output']
            for(osd in data) {
                delta = [0,0];
                delta[0] = data[osd]['r'] - osdIo[osd]['r'];
                delta[1] = data[osd]['w'] - osdIo[osd]['w'];
                var osdGroup = svgGroup.select('g.osdNode' + osd);
                if($('#watch-per').is(":checked")) {
                    if( delta[0] == 0 && delta[1] == 0)
                        osdGroup.selectAll('path')
                            .style('fill-opacity', 0);
                    else
                        osdGroup.selectAll('path')
                            .data(pie(delta))
                            .style('fill', function(d, i) { return i == 0 ? '#00EC00' : '#2894FF'; })
                            .style('fill-opacity', 1)
                            .attr('d', arc);
                }   
                if($('#watch-val').is(':checked')) {
                    osdGroup.select('circle')
                        .style('fill', color(delta[0]+delta[1]));
                }
                osdIo[osd] = data[osd];
            }
        });
    }
}

$(document).ready(function(){
    $('#check-watch').change(function(){
        if($(this).is(":checked")) {
            for(host in hostOSD)
            {
                var url = 'http://' + host + ':5000/api/v0.1/osd/iostat?id=' + hostOSD[host].join(',');
                $.getJSON(url, function(data){
                    data=data['output']
                    for(osd in data) {
                        osdIo[osd] = data[osd];
                    }
                });
            }
            checkTick = setInterval(function(){
                pullIo()
                }, checkIntv);
        }
        else {
            clearInterval(checkTick);
        }
    });
    $("#watch-intv").change(function(){
        checkIntv = $('#watch-intv').val();
        if($('#check-watch').is(":checked")) {
            clearInterval(checkTick);
            checkTick = setInterval(function(){
                pullIo()
                }, checkIntv);
        }
    });
    $("#watch-per").change(function() {
        svgGroup.selectAll('path').style('fill-opacity', $(this).is(":checked") ? 1 : 0);
    });
    $("#watch-val").change(function() {
        svgGroup.selectAll('circle.osd').style('fill', 'white');
    });
});

$("#query-form").submit(function(event){
    event.preventDefault();
    $(".chart-submit").val('Loading...');
    $(".chart-submit").addClass('disabled');
    var url="json?m=query&" + $(this).serialize();
    distJSON = d3.json(url, function(error, distData) {
        nv.addGraph(function() {
            var chart = nv.models.discreteBarChart()
              .staggerLabels(true)
              .tooltips(true)
              .showValues(false)
              .showXAxis(false)
              .color(['#1f77b4'])

            d3.select('#pg-chart svg')
              .datum(distData['pg'])
              .transition().duration(500)
              .call(chart)
              ;

            nv.utils.windowResize(chart.update);

            return chart;
        });
        nv.addGraph(function() {
          var chart = nv.models.pieChart()
              .showLabels(true);

            d3.select("#osd-chart svg")
              .datum(distData['osd'][0]['values'])
              .transition().duration(1200)
              .call(chart);

          return chart;
        });
        $(".chart-submit").val('Search');
        $(".chart-submit").removeClass('disabled');
    });
});
