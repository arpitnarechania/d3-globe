function Earth(projection_string){

var OD_PAIRS = [
    ["NRT", "JFK"],
    ["SFO", "NRT"],
    ["LAX", "HNL"],
    ["HNL", "NRT"],
    ["CDG", "JFK"],
    ["NRT", "SYD"],
    ["FCO", "PEK"],
    ["LHR", "PVG"],
    ["NRT", "ARN"],
    ["LAX", "JFK"],
    ["NRT", "DEL"],
    ["DFW", "GRU"],
    ["MAD", "ATL"],
    ["ORD", "CAI"],
    ["HKG", "CDG"],
    ["LAS", "CDG"],
    ["NRT", "SVO"],
    ["DEN", "HNL"],
    ["ORD", "LAX"],
    ["SIN", "SEA"],
    ["SYD", "PEK"],
    ["CAI", "CPT"],
    ["CUN", "JFK"],
    ["ORD", "JFK"],
    ["LHR", "BOM"],
    ["LAX", "MEX"],
    ["LHR", "CPT"],
    ["PVG", "CGK"],
    ["SYD", "BOM"],
    ["JFK", "CPT"],
    ["MAD", "GRU"],
    ["EZE", "FCO"],
    ["DEL", "DXB"],
    ["DXB", "NRT"],
    ["GRU", "MIA"],
    ["SVO", "PEK"],
    ["YYZ", "ARN"],
    ["LHR", "YYC"],
    ["HNL", "SEA"],
    ["JFK", "EZE"],
    ["EZE", "LAX"],
    ["CAI", "HKG"],
    ["SVO", "SIN"],
    ["IST", "MCO"],
    ["MCO", "LAX"],
    ["FRA", "LAS"],
    ["ORD", "FRA"],
    ["MAD", "JFK"]
  ];

    var airportMap = {};

    var time;
    var scale = 200;
    var rotate = [0, 0];
    var velocity = [.015, -0];
    var width = 600,
        height = 500,
        sens = 0.25,
        focused;

    var rScale = d3.scale.sqrt();
    var rScale2 = d3.scale.sqrt();
    var peoplePerPixel = 50000;
    var max_population = [];

    var projection;
    var path,path_cities,path_earthquakes,path_flight;
    var svg;

    var spinning_globe = function(){};

    var countryTooltip = d3.select("body").append("div").attr("class", "countryTooltip"),
        countryList = document.getElementById("countries");

    queue()
        .defer(d3.json, "../data/world-110m.json")
        .defer(d3.tsv, "../data/world-110m-country-names.tsv")
        .defer(d3.json, "../data/airports.topo.json")
        .await(ready);

    //Main function
    function ready(error, world, countryData,airports) {
        countryById = {};
        countries = topojson.feature(world, world.objects.countries).features;

        //Adding countries to select
        countryData.forEach(function(d) {
            countryById[d.id] = d.name;
            var option =  document.createElement("option");
            option.text = d.name;
            option.value = d.id;
            countryList.add(option);
        });

        // Configuration for the spinning effect
        time = Date.now();

        //Setting projection
        projection = eval("d3.geo."+projection_string+"()")
            .scale(scale)
            .rotate([0, 0])
            .translate([width / 2, height / 2])
            .clipAngle(90);

        path = d3.geo.path()
            .projection(projection);

        path_cities = d3.geo.path()
            .projection(projection);

        path_earthquakes = d3.geo.path()
            .projection(projection);

//        path_flight = d3.geo.path()
//            .projection(projection);

        svg = d3.select("#earth").append("svg")
            .attr("width", width)
            .attr("height", height);

        //SVG container
        //Adding water

        svg.append("path")
            .datum({
                type: "Sphere"
            })
            .attr("class", "water")
            .attr("d", path);

        // Map configuration
        var max = d3.max(countryData,function(d){return d.id});

        var colorScale = d3.scale.linear().domain([0,max]).range(["white","#4169e1"]);

        //Drawing countries on the globe
        var world = svg.selectAll("path.land")
            .data(countries)
            .enter().append("path")
            .attr("class", "land")
            .attr("d", path)
            .attr("fill",function(d){return colorScale(d.id);})

            //Drag event
            .call(d3.behavior.drag()
                .origin(function() {
                    var r = projection.rotate();
                    return {
                        x: r[0] / sens,
                        y: -r[1] / sens
                    };
                })
                .on("drag", function() {
                    var rotate = projection.rotate();
                    projection.rotate([d3.event.x * sens, -d3.event.y * sens, rotate[2]]);
                    svg.selectAll("path.land").attr("d", path);
                    svg.selectAll(".focused").classed("focused", focused = false);
                    svg.selectAll("path.cities").attr("d", path_cities);
                    svg.selectAll("path.earthquakes").attr("d", path_earthquakes);
//                    svg.selectAll(".route").attr("d", path_flight);

                }))

            //Mouse events
            .on("mouseover", function(d) {
                countryTooltip.text(countryById[d.id])
                    .style("left", (d3.event.pageX + 7) + "px")
                    .style("top", (d3.event.pageY - 15) + "px")
                    .style("display", "block")
                    .style("opacity", 1);
            })
            .on("mouseout", function(d) {
                countryTooltip.style("opacity", 0)
                    .style("display", "none");
            })
            .on("mousemove", function(d) {
                countryTooltip.style("left", (d3.event.pageX + 7) + "px")
                    .style("top", (d3.event.pageY - 15) + "px");
            });

        //Country focus on option select
        d3.select("select").on("change", function() {
            var rotate = projection.rotate(),
                focusedCountry = country(countries, this),
                p = d3.geo.centroid(focusedCountry);

            svg.selectAll(".focused").classed("focused", focused = false);

            //Globe rotating

            (function transition() {
                d3.transition()
                    .duration(2500)
                    .tween("rotate", function() {
                        var r = d3.interpolate(projection.rotate(), [-p[0], -p[1]]);
                        return function(t) {
                            projection.rotate(r(t));
                            svg.selectAll("path.land").attr("d", path)
                                .classed("focused", function(d, i) {
                                    return d.id == focusedCountry.id ? focused = d : false;
                                });

                            svg.selectAll("path.cities").attr("d", path_cities);
                            svg.selectAll("path.earthquakes").attr("d", path_earthquakes);
//                            svg.selectAll(".route").attr("d", path_flight);

                        };
                    })
            })();
        });

        function country(cnt, sel) {
            for (var i = 0, l = cnt.length; i < l; i++) {
                if (cnt[i].id == sel.value) {
                    return cnt[i];
                }
            }
        };

        var g = svg.append("g");

        // setting the circle size (not radius!) according to the number of inhabitants per city
        population_array = [];
        for (i = 0; i < data.features.length; i++) {
            population_array.push(data.features[i].properties.population);
        }
        max_population = population_array.sort(d3.descending)[0]
        var rMin = 0;
        var rMax = Math.sqrt(max_population / (peoplePerPixel * Math.PI));
        rScale.domain([0, max_population]);
        rScale.range([rMin, rMax]);

        path_cities.pointRadius(function(d) {
            return d.properties ? rScale(d.properties.population) : 1;
        });

        // Drawing transparent circle markers for cities
        g.selectAll("path.cities").data(data.features)
            .enter().append("path")
            .attr("class", "cities")
            .attr("d", path_cities)
            .attr("fill", "#ffba00")
            .attr("fill-opacity", 1)

        // setting the circle size (not radius!) according to the number of inhabitants per city
        magnitude_array = [];
        for (i = 0; i < earthquake_data.features.length; i++) {
            magnitude_array.push(earthquake_data.features[i].properties.mag);
        }
        max_magnitude = magnitude_array.sort(d3.descending)[0]
        var rMagMin = 0;
        var rMagMax = Math.sqrt(max_magnitude*2);
        rScale2.domain([0, max_magnitude]);
        rScale2.range([rMagMin, rMagMax]);

        path_earthquakes.pointRadius(function(d) {
            return d.properties ? rScale2(d.properties.mag) : 1;
        });

        // Drawing transparent circle markers for cities
        g.selectAll("path.earthquakes").data(earthquake_data.features)
            .enter().append("path")
            .attr("class", "earthquakes")
            .attr("d", path_earthquakes)
            .attr("fill", "#00ff00")
            .attr("fill-opacity", 1)

        spinning_globe = function() {
            d3.timer(function() {

                // get current time
                var dt = Date.now() - time;

                // get the new position from modified projection function
                projection.rotate([rotate[0] + velocity[0] * dt, rotate[1] + velocity[1] * dt]);

                // update cities position = redraw
                svg.selectAll("path.land").attr("d", path)
                svg.selectAll("path.cities").attr("d", path_cities);
                svg.selectAll("path.earthquakes").attr("d", path_earthquakes);
//                svg.selectAll(".route").attr("d", path_flight);
            });
        }

       spinning_globe();

        svg.append("g")
           .attr("class", "airports")
           .selectAll("path.airports")
           .data(topojson.feature(airports, airports.objects.airports).features)
           .enter()
           .append("path.airports")
           .attr("id", function(d) {return d.id;})
           .attr("d", path);

        var geos = topojson.feature(airports, airports.objects.airports).features;
        for (i in geos) {
          airportMap[geos[i].id] = geos[i].geometry.coordinates;
        }

        var i = 0;
        setInterval(function() {
          if (i > OD_PAIRS.length - 1) {
            i = 0;
          }
          var od = OD_PAIRS[i];
          fly(od[0], od[1]);
          i++;
        }, 150);
      }

    function fly(origin, destination) {
        var route = svg.append("path")
                       .datum({type: "LineString", coordinates: [airportMap[origin], airportMap[destination]]})
                       .attr("class", "route")
                       .attr("d", path);

        var plane = svg.append("path")
                       .attr("class", "plane")
                       .attr("d", "m25.21488,3.93375c-0.44355,0 -0.84275,0.18332 -1.17933,0.51592c-0.33397,0.33267 -0.61055,0.80884 -0.84275,1.40377c-0.45922,1.18911 -0.74362,2.85964 -0.89755,4.86085c-0.15655,1.99729 -0.18263,4.32223 -0.11741,6.81118c-5.51835,2.26427 -16.7116,6.93857 -17.60916,7.98223c-1.19759,1.38937 -0.81143,2.98095 -0.32874,4.03902l18.39971,-3.74549c0.38616,4.88048 0.94192,9.7138 1.42461,13.50099c-1.80032,0.52703 -5.1609,1.56679 -5.85232,2.21255c-0.95496,0.88711 -0.95496,3.75718 -0.95496,3.75718l7.53,-0.61316c0.17743,1.23545 0.28701,1.95767 0.28701,1.95767l0.01304,0.06557l0.06002,0l0.13829,0l0.0574,0l0.01043,-0.06557c0,0 0.11218,-0.72222 0.28961,-1.95767l7.53164,0.61316c0,0 0,-2.87006 -0.95496,-3.75718c-0.69044,-0.64577 -4.05363,-1.68813 -5.85133,-2.21516c0.48009,-3.77545 1.03061,-8.58921 1.42198,-13.45404l18.18207,3.70115c0.48009,-1.05806 0.86881,-2.64965 -0.32617,-4.03902c-0.88969,-1.03062 -11.81147,-5.60054 -17.39409,-7.89352c0.06524,-2.52287 0.04175,-4.88024 -0.1148,-6.89989l0,-0.00476c-0.15655,-1.99844 -0.44094,-3.6683 -0.90277,-4.8561c-0.22699,-0.59493 -0.50356,-1.07111 -0.83754,-1.40377c-0.33658,-0.3326 -0.73578,-0.51592 -1.18194,-0.51592l0,0l-0.00001,0l0,0z");

        transition(plane, route);

        function transition(plane, route) {
          var l = route.node().getTotalLength();
          plane.transition()
               .duration(5000)
               .attrTween("transform", delta(route.node()));
        }

        function delta(path) {
          var l = path.getTotalLength();
          return function(i) {
            return function(t) {

                var p = path.getPointAtLength(t * l);
                var t2 = Math.min(t + 0.05, 1);
                var p2 = path.getPointAtLength(t2 * l);

                var x = p2.x - p.x;
                var y = p2.y - p.y;
                var r = 90 - Math.atan2(-y, x) * 180 / Math.PI;

                var s = Math.min(Math.sin(Math.PI * t) * 0.7, 0.3);

                return "translate(" + p.x + "," + p.y + ") scale(" + s + ") rotate(" + r + ")";
            }
          }
        }

      }
}