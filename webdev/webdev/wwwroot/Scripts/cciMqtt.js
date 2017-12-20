const MY_NODE_ID = 130;
const SIM_CAN_ID = 129;

// Telemetry ID's
const TLM_Pose = 32;
const TLM_JulianDay = 33;

const EVT_StartOfCycle = 2;
const EVT_ApplicationStarted = 4;

// some message types to handle
const CCI_MESSAGETYPE_TIMESYNC = 0x00;
const CCI_MESSAGETYPE_EVENT	= 0x01;
const CCI_MESSAGETYPE_TCMREQ = 0x02;
const CCI_MESSAGETYPE_TCMRESP = 0x03;
const CCI_MESSAGETYPE_TLMREQ = 0x04;
const CCI_MESSAGETYPE_TLMRESP = 0x05;

// frameType
const CCI_FRAME_SHORT = 0x00;
const CCI_FRAME_LONG_CTRL = 0x02;
const CCI_FRAME_LONG_DATA = 0x03;

/* Long Frame Packet types */
const CCI_LONG_START = 0x00;
const CCI_LONG_ACK = 0x01;
const CCI_LONG_NACK	= 0x02;
const CCI_LONG_DONE = 0x03;

var client = new Paho.MQTT.Client("adcs-spaceteq", Number(8083), "", "visualisation");

// connect the client
client.connect({onSuccess:onConnect});

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onConnect");
  client.subscribe("STQ/CAN/ADCS");

  // do telemetry request in the event of simulator running
  sendDataShort(SIM_CAN_ID, MY_NODE_ID, TLM_JulianDay, CCI_MESSAGETYPE_TLMREQ, null, 0);
}

// set callback handlers
client.onConnectionLost = function (responseObject) {
    console.log("Connection Lost: "+responseObject.errorMessage);
}
 
 var longMsgLen = 0;
 var longMsgLenBuffer = new Uint8Array(64);
 var longMsgIndex = 0;
 var msg_id_long = 0;
 var msg_type_long = 0;
 var src_long = 0;
client.onMessageArrived = function (message) {
	var payload = message.payloadBytes;
	
	// decode message
	var uint8array = new Uint8Array(payload);
	var msg_id = uint8array[0];
	var src = uint8array[1];
	var dest = uint8array[2];
	var msgType = (uint8array[3] >> 2) & 0x07;
	var frameType = (uint8array[3] >> 0) & 0x03;
	
	// get length field
    var uint16array = new Uint16Array(uint8array);
	var msgLen = uint16array[4];	
			
	if (src == MY_NODE_ID){
		return;
	}

	var data;	
	
	// check whether frame is long or short
	switch (frameType){
		case CCI_FRAME_SHORT:
			if (msgLen != 0){
				data = new Uint8Array(uint8array.buffer, 8);
				switch(msgType){
					case CCI_MESSAGETYPE_TLMRESP:
						handleTelemetryResponse(uint8array, msg_id);
						break;
				}
			}
			else{
				data = null;
			}
			break;
		case CCI_FRAME_LONG_CTRL:
			if (msgLen != 0){
				msg_id_long = msg_id;
				msg_type_long = msgType;
				src_long = src;
				data = new Uint8Array(uint8array.buffer, 8);
			}
			else{
				data = null;
			}

	    	if ((data[0] & 0x0F) == CCI_LONG_START){
				longMsgLen = data[3] || (data[2] << 8) || (data[3] << 16);
			}			

			longMsgIndex = 0; 	// reset index
			//console.log("longCtrlFrame: data = " + data.toString(16) + " LongMsgLen = " + longMsgLen);	
			// set up to receive subsequent packets and build up data
			break;
		case CCI_FRAME_LONG_DATA:
			if (msgLen != 0){
				data = new Uint8Array(uint8array.buffer, 8);
			}
			else{
				data = null;
			}
			
			longMsgLenBuffer.set(data,longMsgIndex);
			longMsgIndex += msgLen;
			
			if (longMsgIndex == longMsgLen){
				// long message received
				switch(msg_type_long){
					case CCI_MESSAGETYPE_TIMESYNC:
						handleTimeSync(longMsgLenBuffer, msg_id_long);
						break;
					case CCI_MESSAGETYPE_TLMRESP:
						handleTelemetryResponse(longMsgLenBuffer, msg_id_long);
						break;
					case CCI_MESSAGETYPE_EVENT:
						handleEvent(src_long, longMsgLenBuffer, msg_id_long);
						break;
				}
			}
			//console.log("longData = " + longMsgLenBuffer.subarray(0,longMsgIndex).toString(16) + " LongMsgIndex = " + longMsgIndex);	
			break;			
		default:
			return;
	}
}

function handleTimeSync(data, msg_id){
	switch(msg_id){
		case EVT_StartOfCycle:
			// check if timeSync
			if (data[0] == 0xFF){
				sendDataShort(SIM_CAN_ID, MY_NODE_ID, TLM_Pose, CCI_MESSAGETYPE_TLMREQ, null, 0);
				var dv = new DataView(data.buffer);
				var jd_time = dv.getFloat64(1, false);
				//console.log(data);
			}
		break;
	}
}

function handleEvent(src, data, msg_id){
	switch(msg_id){
		case EVT_ApplicationStarted:
				// if sim app start then setup cesium
				if (src == SIM_CAN_ID){
					var dv = new DataView(data.buffer);
					var jd_time = dv.getFloat64(1, false);	
					var jd_floor = Math.floor(jd_time);
					var secondsOfDay = (jd_time - jd_floor)*86400;
					var jd = new Cesium.JulianDate(jd_floor, Math.round(secondsOfDay));
					viewer.clock.currentTime = jd;
					//console.log("Start event received with JD = " + jd  + " JS date = " + Cesium.JulianDate.toDate(jd));
				}
			break;
	}

}

function handleTelemetryResponse(data, msg_id){
	switch (msg_id){
		case TLM_Pose:
			var dv = new DataView(data.buffer);
			var jd_time = dv.getFloat64(0, false);
			var quaternion1 = dv.getInt16(8, false);
			var quaternion2 = dv.getInt16(10, false);
			var quaternion3 = dv.getInt16(12, false);
			var quaternion4 = dv.getInt16(14, false);
			var position1 = dv.getInt32(16, false);
			var position2 = dv.getInt32(20, false);
			var position3 = dv.getInt32(24, false);
					
			var position = [jd_time, position1, position2, position3];
			var orientation = [jd_time, quaternion1/32000, quaternion2/32000, quaternion3/32000,quaternion4/32000];
			//console.log(position);
			var json = {
				"id": "EOSAT1",
				"name":"EOSAT1",
				"availability":"2016-03-20T00:00:00Z/2016-06-20T00:00:00Z",
				"description":"<!--HTML--><img\
					width=\"50%\"\
					style=\"float:left; margin: 0 1em 1em 0;\"\
					src=\"../images/spaceteq2.jpg\"/><p>EOSat1</p>\
					<a style=\"color: WHITE\"\
					target=\"_blank\"\
					href=\"http://www.spaceteq.co.za\">SpaceTeq</a>",
				"model":{
                    "gltf": "../images/model/test.gltf",
					"minimumPixelSize" : 100,
					"show": true
				},
				"position": {
					"epoch": "2016-04-20T00:00:00Z",
					"referenceFrame": "INERTIAL",
					"cartesian": position,
					"interpolationAlgorithm": "HERMITE",
					"interpolationDegree": 2,
					"forwardExtrapolationType": "EXTRAPOLATE",
					"forwardExtrapolationDuration": 2.0
				},
				"point": {
					"pixelSize": 5,
					"show": true
				},
				"orientation":{
					"epoch": "2016-04-20T00:00:00Z",
					"unitQuaternion": orientation,
					"interpolationAlgorithm": "LINEAR",
					"interpolationDegree": 5,
					"forwardExtrapolationType": "EXTRAPOLATE",
					"forwardExtrapolationDuration": 2.0,
				}
			};				
			
			czmlDataSource.process(json);		
			break;

		case TLM_JulianDay:
			var dv2 = new DataView(data.buffer);
			var jd_time2 = dv2.getFloat64(8, false);	
			var jd_floor2 = Math.floor(jd_time2);
			var secondsOfDay2 = (jd_time2 - jd_floor2)*86400;
			var jd2 = new Cesium.JulianDate(jd_floor2, Math.round(secondsOfDay2));
			viewer.clock.currentTime = jd2;
			break;
	}
}

function sendDataShort(dest, src, id, msgType, data, len){
	var buffer = new ArrayBuffer(len + 8);

	var uint8_array = new Uint8Array(buffer);
	uint8_array[0] = id;
	uint8_array[1] = src;
	uint8_array[2] = dest;
	uint8_array[3] = (msgType << 2);
	uint8_array[3] |= (0x00);			// frame type short
	uint8_array[3] |= 0x80;				// set extended bit
		
	// set length field
    var uint16_array = new Uint16Array(buffer);
	uint16_array[2] = len;
	
	// reserved
	uint8_array[6] = 0;
	uint8_array[7] = 0;
	
	if (data != null)
		uint8_array.set(data, 8);
		
	var message = new Paho.MQTT.Message(buffer);
	message.destinationName = "STQ/CAN/ADCS";
	message.qos = 0;	
	client.send(message);	
}