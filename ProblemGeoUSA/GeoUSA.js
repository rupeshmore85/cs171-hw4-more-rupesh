/**
 * Created by hen on 3/8/14.
 */

var margin = {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50
};

var width = 1500 - margin.left - margin.right;
var height = 800 - margin.bottom - margin.top;
var centered;

var bbVis = {
    x: 100,
    y: 10,
    w: width - 100,
    h: 300
};

var detailVis = d3.select("#detailVis").append("svg").attr({
    width:350,
    height:200
})

var canvas = d3.select("#vis").append("svg").attr({
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom
    })

var projection = d3.geo.albersUsa().translate([400, height / 2]);//.precision(.1);

var path = d3.geo.path().projection(projection);

var svg = canvas.append("g").attr({
        transform: "translate(" + margin.left + "," + margin.top + ")"
    });

var g = svg.append("g");

displayBoston();

var dataSet = {};
var data1 = {}, keys, sum = [], maxvalue, minvalue, rScale, reducedStationData = {}, 
    sumPerHour= new Array(), hourly ={}, hourKeys = [];

var hourlyArray = new Array();


/* 
 *   The function loads the US map and its states
 */
d3.json("../data/us-named.json", function(error, us) {
     g.append("g")
      .attr("class", "station")
      .selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
      .enter().append("path")
      .attr("d", path)
      .call(d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", zoom));

  g.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "hourLine")
      .attr("d", path);

    loadStats();
})

/* 
 *   The function loads the reduced json file 
 *   generated by AggregationMonthStation.html file
 */
function loadStats() {

    d3.json("../data/reducedMonthStationHour2003_2004.json", function(error,data){
      
      reducedStationData=data;
      keys= d3.keys(data);

      for (i = 0; i< keys.length; i++)
        { sum[i] = data[keys[i]].sum; }

         maxvalue = Math.max.apply(Math, sum);
         minvalue = Math.min.apply(Math, sum);

         // Define Circle Radius scale
         rScale = d3.scale.linear().range([2, 6])
                    .domain([minvalue,maxvalue]);

      loadStations();

    })

}

/* 
 *   The function loads the Stations and 
 *   plots it on the map.
 */
function loadStations() {
    d3.csv("../data/NSRDB_StationsMeta.csv",function(error,data){
    
     svg.selectAll(".pin")
        .data(data)
        .enter().append("circle", ".pin")
        .attr("r",function(d){
                  return getRadius(d.USAF);
             })
        .attr("transform", function(d) {
                  return "translate(" 
                                    + projection(
                                                [d["NSRDB_LON(dd)"],d["NSRDB_LAT (dd)"]]
                                      ) + ")"
              })
        .attr("class","NSRDBStation")
        .style("fill",function(d) {
                  return getColor(d.USAF);
              })
         .on("click", function(d) { detaildisplay(d);})
         .append("svg:title")   // Displays Tooltip
         .text(function(d) { 
                          var sum;
                          //find sum
                          if(reducedStationData.hasOwnProperty(d.USAF)){
                                  sum= reducedStationData[d.USAF].sum
                            }
                  return "station: " + d.STATION +"\nsum: "+sum; 
            });

    });
}

/* 
 *   The function calculates Radius for the 
 *   given station ID based on the Station's Sum
 */
function getRadius(id){

      if(reducedStationData.hasOwnProperty(id)){
          return rScale(reducedStationData[id].sum);

        }
          return 0;
  }

/* 
 *   The function displays Stations with 
 *   no data in Red Color and others in blue
 */
function getColor(id){

      if(reducedStationData.hasOwnProperty(id)){
          if(reducedStationData[id].sum ==0){
            return "red";
          }else{

            return "blue";
          }

        }
          
  }

/* 
 *   The function plots a Bar Chart displaying
 *   Station details for each hour
 */
function detaildisplay(d) {
  
  var ID = d.USAF;

  // Removes the detailed graph 
  // before plotting the current
  svg.selectAll(".bar").remove();
  svg.selectAll(".axis").remove();
  svg.selectAll(".stationName").remove();

  var i=0;

  // Find per hour sum for the given station

      if(reducedStationData.hasOwnProperty(ID)){
          
          hourly = reducedStationData[ID].hourly;

          hourKeys = d3.keys(hourly);

            for (i=0;i<hourKeys.length;i++){
                sumPerHour[i] = parseInt(hourly[hourKeys[i]]);
            }
            
          }

    var minSum = d3.min(sumPerHour);
    var maxSum = d3.max(sumPerHour);

    console.log("min "+minSum+" max :"+maxSum);

    // Define the Axis Scales 
    var barscale  = d3.scale.linear()
                      .range([900,width-300])
                      .domain([0,23]);
    var xScale    = d3.scale.ordinal()
                      .rangeRoundBands([700, width-500])
                      .domain(hourKeys);
    var yScale    = d3.scale.linear()
                      .range([700,500])
                      .domain([minSum,maxSum]);

    var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom")
                .ticks(24);

    var yAxis = d3.svg.axis()
                .scale(yScale)
                .orient("right");

    // Plot X Axis
     svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(200," + 400 + ")")
        .call(xAxis)
        .selectAll("text")
        .text(function(d) {
              return d.substr(0,5);
            })  
        .style("text-anchor", "end")
        .style("font-size", "8px")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", function(d) {
              return "rotate(-65)" 
            });
       
    // Plot Y Axis
     svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate("+1100+"," + -300 + ")")
        .call(yAxis);

    // For plotting the Bars in Chart
     svg.selectAll(".bar")
        .data(sumPerHour)
        .enter().append("rect")
        .attr("transform", "translate(2012,700) rotate(-180)")
        .attr("class", "bar")
        .attr("x", function(d,i) { return barscale(i); })
        .attr("width", 5)
        .attr("y", function(d,i) { return 300; })
        .attr("height", function(d) { return height -yScale(d); });

    // Display the Station Names 
    // as title of the Bar Chart
     svg.append("text") 
        .attr("x", 900) 
        .attr("y", 200)
        .attr("text-anchor", "middle") 
        .style("font-size", "8px") 
        .text(function () { 
                return d.STATION
              })
        .attr("fill","black")
        .attr("class","stationName");
}

/* 
 *   The function Plots Boston on the map with Black Color 
 *   with longitude = 42.3581 & longitude = -71.0636
 */
function displayBoston() {

    var latitude = 42.3581;
    var longitude = -71.0636;
    var screencoord = projection([longitude, latitude]);

     svg.append("circle")
        .attr("r",10)
        .attr("cx",screencoord[0])
        .attr("cy",screencoord[1])
        .attr("class","bostoncircle");
        
     svg.append("circle")
        .attr("r",2)
        .attr("cx",screencoord[0])
        .attr("cy",screencoord[1])
        .attr("class","bostoncircle");
}

/* 
 *    This function is called for Geometric Zoom
 */
function zoom() {
      svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  }
