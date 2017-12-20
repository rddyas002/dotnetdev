// button references
var syncBtn = document.getElementById("sync");
var loadHistoryBtn = document.getElementById("loadHistory");
var loadPrevMissionBtn = document.getElementById("loadPrevMission");
var resetTimeBtn = document.getElementById("resetTime");
var imagerViewBtn = document.getElementById("ImagerView");
var homeViewBtn = document.getElementById("homeView");
var columbusViewBtn = document.getElementById("columbusView");
var groundViewBtn = document.getElementById("groundView");

// checkbox references
var trackSimTimeCheck = document.getElementById("trackSimTimeChk");
var showBodyFrameCheck = document.getElementById("showFrameChk");
var showBeamCheck = document.getElementById("showBeamChk");
var showMedResCheck = document.getElementById("showMedResChk");
var showImageViewCheck = document.getElementById("showImageViewChk");
var showMatrixSensorCheck = document.getElementById("showMatrixSensorChk");
var showOpticalAxisCheck = document.getElementById("showOpticalAxisChk");
var showXbandSensorCheck = document.getElementById("showXbandSensorChk");

// label references
var simTimeLbl = document.getElementById("simTime");
var simLinkLbl = document.getElementById("simLink");
var satInViewLbl = document.getElementById("satInView");
var latitudeLbl = document.getElementById("latitudeLbl");
var longitudeLbl = document.getElementById("longitudeLbl");
var heightLbl = document.getElementById("heightLbl");
var elevationLbl = document.getElementById("elevationLbl");
var azimuthLbl = document.getElementById("azimuthLbl");

var imageViewer = document.getElementById("imagerView");

var EOSat1Frame;
var ECIFrame;
var socket;
var simulatorJulianDate;
var track_simulation_time = false;
var epoch_CesiumJD;
var cameraView = false;
var satelliteInViewFromGS = false;

var rectangularPyramidSensor;
var medResSensor;
var matrixFOVSensor;
var xbandAntenna;
var opticalAxis;

connectWebSocket();

function connectWebSocket() {
    socket = new WebSocket("ws://yreddi-ws.sunspace.co.za:80/ws");

    if (!socket)
        return;

    socket.onopen = function (event) {
        console.log("socket opened");
    }

    socket.close = function (event) {
        console.log("socket closed");
    }

    socket.onmessage = function (event) {
        processData(event.data);
    }
}

function jdSec2CesiumJD(jd_sec) {
    var jd_floor = Math.floor(jd_sec);
    var secondsOfDay = (jd_sec - jd_floor) * 86400;
    return new Cesium.JulianDate(jd_floor, Math.round(secondsOfDay));
}

var prev_multiplier = 1.3;
var prev_error = 0;
var error_added = 0;
function processData(data) {
    try {
        var response = JSON.parse(data);

        // filter data based on id key
        switch (response.id) {
            case 'Pose':
                processPose(response);

                //transl = new Cesium.Cartesian3(response.position[1], response.position[2], response.position[3]);
                //quat = new Cesium.Quaternion(response.quaternion[1], response.quaternion[2], response.quaternion[3], response.quaternion[4]);
                //EOSat1.modelMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(transl, quat, new Cesium.Cartesian3(1,1,1)); 

                // indicate on view what simulation time at server is...
                simulatorJulianDate = jdSec2CesiumJD(response.SimTime);
                var simTimeIso8601 = Cesium.JulianDate.toIso8601(simulatorJulianDate);
                simTimeLbl.innerHTML = "Simulation Time: <br />" + simTimeIso8601;
                simLinkLbl.innerHTML = "Simulator connected";
                simLinkLbl.style.backgroundColor = "green";

                if (track_simulation_time) {
                    var current_time_jd = Cesium.JulianDate.totalDays(viewer.clock.currentTime);
                    var sim_time_jd = Cesium.JulianDate.totalDays(simulatorJulianDate);
                    var current_error = ((sim_time_jd - 2 / 86400) - current_time_jd);
                    error_added += current_error;
                    var multiplier = 2 + (22000 * current_error) + 0.0 * error_added + 0.8 * (current_error - prev_error);
                    // saturation limits
                    if (multiplier > 5)
                        multiplier = 5;
                    if (multiplier < -3)
                        multiplier = -3;
                    viewer.clock.multiplier = multiplier;
                    prev_error = current_error;
                    //console.log(viewer.clock.multiplier + " error: " + current_error);
                }
                break;

            case 'History':
                // clear data sources and load full history
                //viewer.dataSources.removeAll();
                //czmlDataSource = new Cesium.CzmlDataSource();
                //czmlDataSource.process(czml_EOSat1);
                //viewer.dataSources.add(czmlDataSource);
                processPose(response);
                console.log("History loaded");
                break;

            case 'Epoch':
                var epoch_jd = response.Epoch;
                epoch_CesiumJD = jdSec2CesiumJD(epoch_jd);
                viewer.clock.currentTime = epoch_CesiumJD;
                viewer.clock.startTime = epoch_CesiumJD;
                console.log("New Epoch received: " + Cesium.JulianDate.toIso8601(epoch_CesiumJD));
                break;

            default:
                console.log("Unhandled id (ws)" + data);
                break;
        }
    }
    catch (e) {
        console.log("invalid JSON packet received: " + data);
    }
}

function processPose(data) {
    var json = {
        "id": "EOSAT1",
        "name": "EOSAT1",
        "availability": "2016-03-20T00:00:00Z/2016-06-20T00:00:00Z",
        "description": "<!--HTML--><img\
					width=\"50%\"\
					style=\"float:left; margin: 0 1em 1em 0;\"\
					src=\"../images/spaceteq2.jpg\"/><p>EOSat1</p>\
					<a style=\"color: WHITE\"\
					target=\"_blank\"\
					href=\"http://www.spaceteq.co.za\">SpaceTeq</a>",
        "model": {
            "gltf": "/../images/EOSat1_SD/EOSat1_SD.gltf",
            "minimumPixelSize": 0.0,
            "show": true
        },
        "position": {
            "epoch": Cesium.JulianDate.toIso8601(epoch_CesiumJD),
            "referenceFrame": "INERTIAL",
            "cartesian": data.position,
            "interpolationAlgorithm": "HERMITE",
            "interpolationDegree": 10
        },
        "point": {
            "color": {
                "rgba": [220, 119, 19, 255]
            },
            "pixelSize": 10,
            "show": true
        },
        "orientation": {
            "epoch": Cesium.JulianDate.toIso8601(epoch_CesiumJD),
            "unitQuaternion": data.quaternion,
            "interpolationAlgorithm": "HERMITE",
            "interpolationDegree": 10
        },
        "path": {
            "material": {
                "polylineOutline": {
                    "color": {
                        "rgba": [244, 155, 66, 100]
                    },
                    "outlineColor": {
                        "rgba": [244, 212, 66, 100]
                    },
                    "outlineWidth": 4
                }
            },
            "width": 2,
            "leadTime": 10,
            "trailTime": 5800,
            "resolution": 5
        },
    };

    czmlDataSource.process(json);
}

/****************************************
    click functions
****************************************/

loadHistoryBtn.onclick = function () {
    $.get("/Visualise/LoadHistory", function (data) {
    });
}

loadPrevMissionBtn.onclick = function () {
    $.get("/Visualise/LoadPrevMission", function (data) {
    });
}

resetTimeBtn.onclick = function () {
    viewer.clock.currentTime = epoch_CesiumJD;
}

imagerViewBtn.onclick = function () {
    var entity = czmlDataSource.entities.getById('EOSAT1');
    viewer.trackedEntity = entity; //Camera will now track entity 
}

homeViewBtn.onclick = function () {
    var transitioner = new Cesium.SceneModePickerViewModel(viewer.scene);
    transitioner.morphTo3D();
    viewer.camera.flyHome();
    viewer.trackedEntity = undefined;
}

columbusViewBtn.onclick = function () {
    var transitioner = new Cesium.SceneModePickerViewModel(viewer.scene);
    transitioner.morphTo2D();
}

groundViewBtn.onclick = function () {
    viewer.trackedEntity = undefined;
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(19.129569, -34.227458, 20),
        orientation: {
            heading: Cesium.Math.toRadians(-10.0),
            pitch: Cesium.Math.toRadians(0.0),
            roll: 0.0
        }
    });
}

syncBtn.onclick = function () {
    if (simulatorJulianDate !== undefined) {
        var view_jd = Cesium.JulianDate.addSeconds(simulatorJulianDate, -5, new Cesium.JulianDate);
        viewer.clock.currentTime = view_jd;
        viewer.clock.shouldAnimate = true;
        viewer.clock.multiplier = 1;
    }
    else {
        alert("Simulation time not received yet!");
    }
}

trackSimTimeChk.onclick = function () {
    if (trackSimTimeChk.checked) {
        track_simulation_time = true;
    }
    else {
        track_simulation_time = false;
        viewer.clock.multiplier = 1;
    }
}

// add axes
showFrameChk.onclick = function () {
    if (showFrameChk.checked) {
        // create reference frame
        EOSat1Frame = viewer.scene.primitives.add(new Cesium.DebugModelMatrixPrimitive({
            id: 'EOSat1Frame',
            length: 2000,
            width: 5.0
        }));
        ECIFrame = viewer.scene.primitives.add(new Cesium.DebugModelMatrixPrimitive({
            length: 100000000.0,
            width: 5.0,
            id: "ECIFrame"
        }));
    }
    else {
        if (EOSat1Frame !== undefined) {
            viewer.scene.primitives.remove(EOSat1Frame);
        }
        if (ECIFrame !== undefined) {
            viewer.scene.primitives.remove(ECIFrame);
        }
    }
}

showBeamChk.onclick = function () {
    if (showBeamChk.checked) {
        if (rectangularPyramidSensor === undefined) {
            rectangularPyramidSensor = new CesiumSensorVolumes.RectangularPyramidSensorVolume();
            rectangularPyramidSensor.radius = 1200e3;
            rectangularPyramidSensor.xHalfAngle = Cesium.Math.toRadians(0.95);
            rectangularPyramidSensor.yHalfAngle = Cesium.Math.toRadians(0.02);
            rectangularPyramidSensor.lateralSurfaceMaterial = Cesium.Material.fromType('Color');
            rectangularPyramidSensor.lateralSurfaceMaterial.uniforms.color = new Cesium.Color(0.0, 1.0, 1.0, 0.3);
            rectangularPyramidSensor.showIntersection = true;
            rectangularPyramidSensor.intersectionColor = new Cesium.Color(0.0, 1.0, 1.0, 1);
            viewer.scene.primitives.add(rectangularPyramidSensor);
        }
    }
    else {
        if (rectangularPyramidSensor !== undefined) {
            viewer.scene.primitives.remove(rectangularPyramidSensor);
            rectangularPyramidSensor = undefined;
        }
    }
}

showMatrixSensorChk.onclick = function () {
    if (showMatrixSensorChk.checked) {
        if (matrixFOVSensor === undefined) {
            matrixFOVSensor = new CesiumSensorVolumes.RectangularPyramidSensorVolume();
            matrixFOVSensor.xHalfAngle = Cesium.Math.toRadians(0.95);
            matrixFOVSensor.yHalfAngle = Cesium.Math.toRadians(0.95);
            matrixFOVSensor.lateralSurfaceMaterial = Cesium.Material.fromType('Color');
            matrixFOVSensor.lateralSurfaceMaterial.uniforms.color = new Cesium.Color(1.0, 0.5, 0.0, 0.5);
            matrixFOVSensor.showIntersection = true;
            matrixFOVSensor.intersectionColor = new Cesium.Color(1.0, 0.5, 0.0, 1);
            viewer.scene.primitives.add(matrixFOVSensor);
        }
    }
    else {
        if (matrixFOVSensor !== undefined) {
            viewer.scene.primitives.remove(matrixFOVSensor);
            matrixFOVSensor = undefined;
        }
    }
}

showOpticalAxisCheck.onclick = function () {
    if (showOpticalAxisCheck.checked) {
        if (opticalAxis === undefined) {
            var sat = czmlDataSource.entities.getById("EOSAT1");
            opticalAxis = viewer.entities.add({
                name: 'opticalAxis',
                position: new Cesium.CallbackProperty(function (time) {
                    // check if data for EOSAT1 exists at current time
                    var ori = sat.orientation.getValue(time);
                    if (ori === undefined)
                        return new Cesium.Cartesian3(0, 0, 0);
                    // shift cone origin
                    var shift = new Cesium.Cartesian3(0, 0, 400e3);
                    var sat_pos = sat.position.getValue(time);

                    var q = new Cesium.Quaternion(ori.x, ori.y, ori.z, ori.w);
                    var DCM = Cesium.Matrix3.fromQuaternion(q);
                    Cesium.Matrix3.multiplyByVector(DCM, shift, shift);
                    Cesium.Cartesian3.add(shift, sat_pos, shift);
                    return shift;
                }, false),
                orientation: new Cesium.CallbackProperty(function (time) {
                    var ori = sat.orientation.getValue(time);
                    if (ori === undefined)
                        return new Cesium.Quaternion(0, 0, 0, 1);
                    else
                        return ori;
                }, false),
                cylinder: {
                    length: 800e3,
                    topRadius: 100,
                    bottomRadius: 100,
                    material: Cesium.Color.fromAlpha(Cesium.Color.BLUE, 0.5)
                },
                show: new Cesium.CallbackProperty(function () {
                    var ori = sat.orientation.getValue(time);
                    if (ori === undefined)
                        return false;
                    else
                        return true;
                }, false)
            });
        }
    }
    else {
        if (opticalAxis !== undefined) {
            viewer.entities.remove(opticalAxis);
            opticalAxis = undefined;
        }
    }
}

showMedResChk.onclick = function () {
    if (showMedResChk.checked) {
        if (medResSensor === undefined) {
            medResSensor = new CesiumSensorVolumes.RectangularPyramidSensorVolume();
            medResSensor.radius = 1200e3;
            medResSensor.xHalfAngle = Cesium.Math.toRadians(2.45);
            medResSensor.yHalfAngle = Cesium.Math.toRadians(0.02);
            medResSensor.lateralSurfaceMaterial = Cesium.Material.fromType('Color');
            medResSensor.lateralSurfaceMaterial.uniforms.color = new Cesium.Color(1.0, 0.0, 0.0, 0.3);
            medResSensor.showIntersection = true;
            medResSensor.intersectionColor = new Cesium.Color(1.0, 0.0, 0.0, 1);
            viewer.scene.primitives.add(medResSensor);
        }
    }
    else {
        if (medResSensor !== undefined) {
            viewer.scene.primitives.remove(medResSensor);
            medResSensor = undefined;
        }
    }
}

showXbandSensorChk.onclick = function () {
    if (showXbandSensorChk.checked) {
        if (xbandAntenna === undefined) {
            xbandAntenna = new CesiumSensorVolumes.CustomSensorVolume();
            xbandAntenna.radius = 1200e3;

            var directions = [];
            for (var i = 0; i < 360; ++i) {
                var clock = Cesium.Math.toRadians(i);
                var cone = Cesium.Math.toRadians(2.0);
                directions.push(new Cesium.Spherical(clock, cone));
            }
            xbandAntenna.directions = directions;
            xbandAntenna.lateralSurfaceMaterial = Cesium.Material.fromType('Color');
            xbandAntenna.lateralSurfaceMaterial.uniforms.color = new Cesium.Color(0.0, 1.0, 0.0, 0.3);
            xbandAntenna.showIntersection = true;
            xbandAntenna.intersectionColor = new Cesium.Color(0.0, 1.0, 0.0, 1);
            viewer.scene.primitives.add(xbandAntenna);
        }
    }
    else {
        if (xbandAntenna !== undefined) {
            viewer.scene.primitives.remove(xbandAntenna);
            xbandAntenna = undefined;
        }
    }
}

showImageViewChk.onclick = function () {
    if (showImageViewChk.checked) {
        image_viewer = new Cesium.Viewer('imageViewInside', {
 /*           imageryProvider: new Cesium.createTileMapServiceImageryProvider({
                url: '/images/200407.3x86400x43200',
                maximumLevel: 9,
                credit: 'Imagery courtesy of NASA'
            }),
*/            timeline: false,
            animation: false,
            homeButton: false,
            infoButton: false,
            navigationHelpButton: false,
            sceneModePicker: false,
            selectionIndicator: false,
            geocoder: false,
            baseLayerPicker: false,
            automaticallyTrackDataSourceClocks: false,
            creditContainer: 'dummy',
            useDefaultRenderLoop: false
        });

        // disable the default event handlers
        image_viewer.scene.screenSpaceCameraController.enableRotate = false;
        image_viewer.scene.screenSpaceCameraController.enableTranslate = false;
        image_viewer.scene.screenSpaceCameraController.enableZoom = true;
        image_viewer.scene.screenSpaceCameraController.enableTilt = false;
        image_viewer.scene.screenSpaceCameraController.enableLook = false;

        image_viewer.scene.globe.enableLighting = true;
        image_viewer.scene.globe.tileCacheSize = 10;
        image_viewer.fullscreenButton.destroy();

        cameraView = true;
    }
    else {
        cameraView = false;
        image_viewer.destroy();
        image_viewer = undefined;
    }
}

/****************************************
    EVENTS
*****************************************/
var show_xband = false;
viewer.clock.onTick.addEventListener(function () {
    var sat = czmlDataSource.entities.getById("EOSAT1");
    // if satellite entity exists
    if (sat !== undefined) {
        var modelMatrix = sat.computeModelMatrix(viewer.clock.currentTime);
        if (modelMatrix !== undefined) {
            // modelMatrix contains rotation and translation
            // we need to translate in the body frame
            // get rotation matrix
            var dcm = Cesium.Matrix4.getRotation(modelMatrix, new Cesium.Matrix3());
            var translation = Cesium.Matrix4.getTranslation(modelMatrix, new Cesium.Cartesian3());
        }

        if (modelMatrix !== undefined && showBodyFrameCheck.checked) {
            EOSat1Frame.modelMatrix = modelMatrix;
            // Get distance to Eosat
            var bs = new Cesium.BoundingSphere(sat.position.getValue(viewer.clock.currentTime));
            var distance = viewer.camera.distanceToBoundingSphere(bs);
            EOSat1Frame.length = distance / 5;
        }
        // setup sensor pose
        if (modelMatrix !== undefined && rectangularPyramidSensor !== undefined) {
            rectangularPyramidSensor.modelMatrix = modelMatrix;
        }
        if (modelMatrix !== undefined && matrixFOVSensor !== undefined) {
            matrixFOVSensor.modelMatrix = modelMatrix;
        }
        if (modelMatrix !== undefined && medResSensor !== undefined) {
            var offset = Cesium.Matrix3.multiplyByVector(dcm, new Cesium.Cartesian3(0, -380, 0), new Cesium.Cartesian3());
            var medRes_translation = Cesium.Cartesian3.add(translation, offset, new Cesium.Cartesian3());
            medResModelMatrix = Cesium.Matrix4.fromRotationTranslation(dcm, medRes_translation, new Cesium.Matrix4());
            medResSensor.modelMatrix = medResModelMatrix;
        }
        // xband antenna
        if (modelMatrix !== undefined && xbandAntenna !== undefined) {
            var offset2 = Cesium.Matrix3.multiplyByVector(dcm, new Cesium.Cartesian3(115, 390, 100), new Cesium.Cartesian3());
            var xband_translation = Cesium.Cartesian3.add(translation, offset2, new Cesium.Cartesian3());
            // subsequent rotation
            var dcm_roll = Cesium.Matrix3.fromRotationX(-11 * Cesium.Math.PI / 180, new Cesium.Matrix3());
            var dcm_xband = Cesium.Matrix3.multiply(dcm, dcm_roll, new Cesium.Matrix3());
            xbandAntennaModelMatrix = Cesium.Matrix4.fromRotationTranslation(dcm_xband, xband_translation, new Cesium.Matrix4());
            xbandAntenna.modelMatrix = xbandAntennaModelMatrix;
            xbandAntenna.show = show_xband;
            show_xband = !show_xband;
        }
        // update position labels
        var sat_position2 = sat.position.getValueInReferenceFrame(viewer.clock.currentTime, Cesium.ReferenceFrame.FIXED);
        if (sat_position2 !== undefined) {
            var sat_lla = Cesium.Cartographic.fromCartesian(sat_position2);
            var latitude = sat_lla.latitude * 180 / Cesium.Math.PI;
            var longitude = sat_lla.longitude * 180 / Cesium.Math.PI;
            var height = sat_lla.height / 1000;

            latitudeLbl.innerHTML = latitude.toFixed(2).toString();
            longitudeLbl.innerHTML = longitude.toFixed(2).toString();
            heightLbl.innerHTML = height.toFixed(2).toString();
        }

        // check if satellite orientation exists 
        var sat_q = sat.orientation.getValue(viewer.clock.currentTime);
        if (sat_q !== undefined) {
            // compute rotation matrix from quaternion
            var dcm2 = Cesium.Matrix3.fromQuaternion(sat_q, new Cesium.Matrix3());
            // show solar panel view
            var solar_panel_in_body = new Cesium.Cartesian3(0, -1, 0);
            var solar_panel_in_ecef = Cesium.Matrix3.multiplyByVector(dcm2, solar_panel_in_body, new Cesium.Cartesian3());
            // up direction
            var solar_up_ecef = Cesium.Matrix3.multiplyByVector(dcm2, new Cesium.Cartesian3(0, 0, -1), new Cesium.Cartesian3());
            // get satellite position
            var sat_position = sat.position.getValueInReferenceFrame(viewer.clock.currentTime, Cesium.ReferenceFrame.FIXED);

            /*
            solar_viewer.camera.direction = solar_panel_in_ecef;
            solar_viewer.camera.up = solar_up_ecef;
            solar_viewer.camera.position = sat_position;
            solar_viewer.camera.frustum.fov = 130.0 * Cesium.Math.PI / 180.0;
            solar_viewer.camera.frustum.aspectRatio = 1;
            solar_viewer.camera.frustum.near = 1.0;
            //solar_viewer.clock = viewer.clock;
            solar_viewer.render();
            */

            // update view if image view was checked
            if (cameraView) {
                // up direction
                var imager_up_ecef = Cesium.Matrix3.multiplyByVector(dcm2, new Cesium.Cartesian3(1, 0, 0), new Cesium.Cartesian3());
                var imager_in_ecef = Cesium.Matrix3.multiplyByVector(dcm2, new Cesium.Cartesian3(0, 0, 1), new Cesium.Cartesian3());
                // set direction
                image_viewer.camera.direction = imager_in_ecef;
                image_viewer.camera.up = imager_up_ecef;

                image_viewer.camera.position = sat_position;
                image_viewer.camera.frustum.fov = 1.9 * Cesium.Math.PI / 180;
                image_viewer.camera.frustum.aspectRatio = 1;
                //image_viewer.clock = viewer.clock;
                image_viewer.render();
            }
        }
    }

    // move the dish
    if (dish !== undefined) {       
        trackSatellite(viewer.clock.currentTime);
    }
});

function trackSatellite(time) {
    var sat = czmlDataSource.entities.getById("EOSAT1");
    if (dish === undefined)
        return;

    if (sat === undefined)
        return;

    var eosat_position = sat.position.getValueInReferenceFrame(time, Cesium.ReferenceFrame.FIXED);
    if (eosat_position === undefined)
        return;

    // satellite position with respect to ground station in fixed frame
    vecGnd2Sat = Cesium.Cartesian3.subtract(eosat_position, groundInFixed, new Cesium.Cartesian3());
    // compute range to satellite
    var range = Cesium.Cartesian3.magnitude(vecGnd2Sat);
    // map relative position to ground station in NED
    var satInFixed = new Cesium.Cartesian4(eosat_position.x, eosat_position.y, eosat_position.z, -1);
    var sat_NED = Cesium.Matrix4.multiplyByPoint(Fixed2NED, satInFixed, new Cesium.Cartesian3());
    // compute azimuth
    var azimuth = Math.atan2(sat_NED.y, sat_NED.x);
    var xy = Math.sqrt(Math.pow(sat_NED.x, 2) + Math.pow(sat_NED.y, 2));
    var dish_pitch = Math.atan2(sat_NED.z, xy);
//    console.log("AZ: " + azimuth * 180 / Cesium.Math.PI + " El: " + dish_pitch * 180 / Cesium.Math.PI);
    if (dish_pitch <= 0) {
        if (satelliteInViewFromGS === false) {
            satelliteInViewFromGS = true;
            satInViewLbl.style.backgroundColor = "green";
            satInViewLbl.innerHTML = "Satellite In View";
        }
        var elevation_degrees = -dish_pitch * 180 / Cesium.Math.PI;
        elevationLbl.innerHTML = elevation_degrees.toFixed(2).toString();
        var azimuth_degrees = azimuth * 180 / Cesium.Math.PI;
        azimuthLbl.innerHTML = azimuth_degrees.toFixed(2).toString();
        dish.modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(GsDishPosition, new Cesium.HeadingPitchRoll(azimuth, 0.0, -dish_pitch));
    }
    else {
        if (satelliteInViewFromGS === true) {
            satelliteInViewFromGS = false;
            satInViewLbl.style.backgroundColor = "red";
            satInViewLbl.innerHTML = "Satellite Not View";
            elevationLbl.innerHTML = "N/A";
            azimuthLbl.innerHTML = "N/A";
        }
    }
}