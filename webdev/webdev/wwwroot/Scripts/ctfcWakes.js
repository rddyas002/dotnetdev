Cesium.BingMapsApi.defaultKey = "f9bi6fIZNm3w98sNXXhR~H1vdqlbzNAuLNn6607rNiA~AhiZmKtvhQltEYCRO3P6Z7yugnt-UVX4wFSoVOdgpiU5MNT4Af9bUCBUJJszna9a";

var viewer = new Cesium.Viewer('cesiumContainer', {
      /*imageryProvider : new Cesium.TileMapServiceImageryProvider({
        url : Cesium.buildModuleUrl('cesium-assets/imagery/NaturalEarthII')}),*/
    timeline: true,
    animation: true,
    homeButton: false,
    infoButton: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: true,
    geocoder: false,
    baseLayerPicker: false,
    automaticallyTrackDataSourceClocks: true,
    creditContainer: 'dummy'
});
 
//Enable lighting based on sun/moon positions
viewer.scene.globe.enableLighting = true;
 
var scene = viewer.scene;
var primitives = scene.primitives;

// form entities in cmzl form
 
// Create websocket
// var socket = io();
var czmlDataSource = new Cesium.CzmlDataSource();
//console.log('Websocket opened');
viewer.camera.flyTo({
    destination : Cesium.Cartesian3.fromDegrees(18.837977, 0, 15000000.0)
});
 
var start = Cesium.JulianDate.fromDate(new Date());
viewer.clock.currentTime = start.clone();
viewer.clock.startTime = start.clone();
 /*
socket.on('czml-test', function(msg){
    var response = JSON.parse(msg);
    viewer.entities.removeAll();
    var entity = viewer.entities.add({
        id: response.nam,
        name: response.nam,
          position: Cesium.Cartesian3.fromDegrees(response.lon, response.lat, response.alt),
        point: {
            color: Cesium.Color.RED,
            pixelSize: 5,
            show: true
        },
            ellipsoid : {
                    radii : new Cesium.Cartesian3(response.acc, response.acc, response.acc),
                    material : Cesium.Color.BLUE.withAlpha(0.3)
            }
    });
    console.log(response.dt);
});
*/
client = new Paho.MQTT.Client("104.196.195.27", 1884, "clientId");
// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

// Connect the client, with a Username and Password
client.connect({
    onSuccess: onConnect,
    userName: "yashren",
    password : "mqtt"
});

// called when the client connects
function onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    console.log("onConnect");
    client.subscribe("TrackMe");
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:" + responseObject.errorMessage);
    }
}

// called when a message arrives
function onMessageArrived(message) {
    console.log("onMessageArrived:" + message.payloadString);
}