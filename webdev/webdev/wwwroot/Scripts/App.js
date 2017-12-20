// start up view
var extent = Cesium.Rectangle.fromDegrees(10, 10, 10, 10);
Cesium.Camera.DEFAULT_VIEW_FACTOR = 5;
Cesium.Camera.DEFAULT_VIEW_RECTANGLE = extent;

Cesium.BingMapsApi.defaultKey = "f9bi6fIZNm3w98sNXXhR~H1vdqlbzNAuLNn6607rNiA~AhiZmKtvhQltEYCRO3P6Z7yugnt-UVX4wFSoVOdgpiU5MNT4Af9bUCBUJJszna9a";

// main viewer
var viewer = new Cesium.Viewer('cesiumContainer', {
/*    imageryProvider: new Cesium.createTileMapServiceImageryProvider({
        url: '/images/200407.3x86400x43200',
           maximumLevel: 9,
           credit: 'Imagery courtesy of NASA'
       }),*/
    timeline: false,
    animation: true,
    homeButton: false,
    infoButton: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    geocoder: false,
    baseLayerPicker: false,
    automaticallyTrackDataSourceClocks: true,
    shadows: true,
    targetFrameRate: 60,
    skyBox: new Cesium.SkyBox({
        sources: {
            positiveX: '/Scripts/cesium-assets/stars/TychoSkymapII.t3_08192x04096/TychoSkymapII.t3_08192x04096_80_px.jpg',
            negativeX: '/Scripts/cesium-assets/stars/TychoSkymapII.t3_08192x04096/TychoSkymapII.t3_08192x04096_80_mx.jpg',
            positiveY: '/Scripts/cesium-assets/stars/TychoSkymapII.t3_08192x04096/TychoSkymapII.t3_08192x04096_80_py.jpg',
            negativeY: '/Scripts/cesium-assets/stars/TychoSkymapII.t3_08192x04096/TychoSkymapII.t3_08192x04096_80_my.jpg',
            positiveZ: '/Scripts/cesium-assets/stars/TychoSkymapII.t3_08192x04096/TychoSkymapII.t3_08192x04096_80_pz.jpg',
            negativeZ: '/Scripts/cesium-assets/stars/TychoSkymapII.t3_08192x04096/TychoSkymapII.t3_08192x04096_80_mz.jpg'
        },
        show: true
    }),
    creditContainer: 'dummy'
});

viewer.dataSources.add(Cesium.GeoJsonDataSource.load('/images/eez.json', {
    stroke: new Cesium.Color(0, 0.2, 0.8, 0.2),
    fill: new Cesium.Color(0,0.2,0.8,0.2),
    strokeWidth: 2,
    markerSymbol: '?'
}));

//Enable lighting based on sun/moon positions
viewer.scene.globe.enableLighting = true;

//Enable terrain
var terrainProvider = new Cesium.CesiumTerrainProvider({
    url: '//assets.agi.com/stk-terrain/world',
    requestWaterMask: true
});
viewer.terrainProvider = terrainProvider;
var primitives = viewer.scene.primitives;

/*
// Load spaceteq logo
var logoUrl = '/images/spaceteq3.jpg';
var logHart = '/images/sansa.jpg';

var billboards = viewer.scene.primitives.add(new Cesium.BillboardCollection());

billboards.add({
    image : logoUrl,
    position : Cesium.Cartesian3.fromDegrees(19.128825, -34.224513),
    scale: 0.25,
    horizontalOrigin: Cesium.HorizontalOrigin.RIGHT,
    verticalOrigin: Cesium.VerticalOrigin.TOP
});

billboards.add({
    image : logHart,
    position : Cesium.Cartesian3.fromDegrees(27.685284, -25.889992),
    scale: 0.25,
    horizontalOrigin: Cesium.HorizontalOrigin.RIGHT,
    verticalOrigin: Cesium.VerticalOrigin.TOP,
});

// load ground station
var GsLocationBase = Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(19.128978, -34.226049));
var GsDishPosition = new Cesium.Cartesian3.fromDegrees(19.128978, -34.226049, 16);
var GsLocationDish = Cesium.Transforms.headingPitchRollToFixedFrame(GsDishPosition, new Cesium.HeadingPitchRoll(0.0, 0.0, 0.0 * Cesium.Math.PI / 180));
var dish_pitch = 0;
var pitch_up = true;

var dishBase = viewer.scene.primitives.add(Cesium.Model.fromGltf({
    url: '../images/dish/dish_base.gltf',
    modelMatrix: GsLocationBase,
    scale: 2.0
}));
var dish = viewer.scene.primitives.add(Cesium.Model.fromGltf({
    url: '../images/dish/dish2.gltf',
    modelMatrix: GsLocationDish,
    scale: 2.0
}));

// ground position in fixed frame
var groundInFixed = Cesium.Cartesian3.fromDegrees(19.128978, -34.226049);
// find transform for fixed to North, East, Down for GS
var NorthEastDown2Fixed = Cesium.Transforms.northEastDownToFixedFrame(Cesium.Cartesian3.fromDegrees(19.128978, -34.226049));
var EastNorthUp2Fixed = Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(19.128978, -34.226049));
// compute transform from fixed to NED
var Fixed2NED = Cesium.Matrix4.inverseTransformation(NorthEastDown2Fixed, new Cesium.Matrix4());
var Fixed2ENU = Cesium.Matrix4.inverseTransformation(EastNorthUp2Fixed, new Cesium.Matrix4());
GroundStationFrame = viewer.scene.primitives.add(new Cesium.DebugModelMatrixPrimitive({
    id: 'GroundStationFrame',
    length: 2000000,
    width: 5,
    modelMatrix: NorthEastDown2Fixed,
    show: false
}));


var czmlDataSource = new Cesium.CzmlDataSource();
// load initial  entity
var czml_EOSat1 =   [
    {
        "id": "document",
		"version": "1.0",
		"clock":{
			"interval":"2016-01-00T00:00:00Z/2018-01-00T00:00:00Z",
				"currentTime":"2016-04-20T00:00:00Z",
				"multiplier":1,
                "range":"CLAMPED ",
				"step":"SYSTEM_CLOCK_MULTIPLIER"
        },
	}
];

viewer.clock.currentTime = czml_EOSat1[0].clock.currentTime;
viewer.clock.multiplier = czml_EOSat1[0].clock.multiplier;
viewer.clock.shouldAnimate = false;
czmlDataSource.process(czml_EOSat1);
viewer.dataSources.add(czmlDataSource);
*/
