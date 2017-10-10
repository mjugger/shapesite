'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*
Copyright (c) 2011 Juan Mellado

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
References:
- "OpenCTM: The Open Compressed Triangle Mesh file format" by Marcus Geelnard
  http://openctm.sourceforge.net/
*/

var CTM = CTM || {};

// browserify support
if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object') {

	module.exports = CTM;
}

CTM.CompressionMethod = {
	RAW: 0x00574152,
	MG1: 0x0031474d,
	MG2: 0x0032474d
};

CTM.Flags = {
	NORMALS: 0x00000001
};

CTM.File = function (stream) {
	this.load(stream);
};

CTM.File.prototype.load = function (stream) {
	this.header = new CTM.FileHeader(stream);

	this.body = new CTM.FileBody(this.header);

	this.getReader().read(stream, this.body);
};

CTM.File.prototype.getReader = function () {
	var reader;

	switch (this.header.compressionMethod) {
		case CTM.CompressionMethod.RAW:
			reader = new CTM.ReaderRAW();
			break;
		case CTM.CompressionMethod.MG1:
			reader = new CTM.ReaderMG1();
			break;
		case CTM.CompressionMethod.MG2:
			reader = new CTM.ReaderMG2();
			break;
	}

	return reader;
};

CTM.FileHeader = function (stream) {
	stream.readInt32(); //magic "OCTM"
	this.fileFormat = stream.readInt32();
	this.compressionMethod = stream.readInt32();
	this.vertexCount = stream.readInt32();
	this.triangleCount = stream.readInt32();
	this.uvMapCount = stream.readInt32();
	this.attrMapCount = stream.readInt32();
	this.flags = stream.readInt32();
	this.comment = stream.readString();
};

CTM.FileHeader.prototype.hasNormals = function () {
	return this.flags & CTM.Flags.NORMALS;
};

CTM.FileBody = function (header) {
	var i = header.triangleCount * 3,
	    v = header.vertexCount * 3,
	    n = header.hasNormals() ? header.vertexCount * 3 : 0,
	    u = header.vertexCount * 2,
	    a = header.vertexCount * 4,
	    j = 0;

	var data = new ArrayBuffer((i + v + n + u * header.uvMapCount + a * header.attrMapCount) * 4);

	this.indices = new Uint32Array(data, 0, i);

	this.vertices = new Float32Array(data, i * 4, v);

	if (header.hasNormals()) {
		this.normals = new Float32Array(data, (i + v) * 4, n);
	}

	if (header.uvMapCount) {
		this.uvMaps = [];
		for (j = 0; j < header.uvMapCount; ++j) {
			this.uvMaps[j] = { uv: new Float32Array(data, (i + v + n + j * u) * 4, u) };
		}
	}

	if (header.attrMapCount) {
		this.attrMaps = [];
		for (j = 0; j < header.attrMapCount; ++j) {
			this.attrMaps[j] = { attr: new Float32Array(data, (i + v + n + u * header.uvMapCount + j * a) * 4, a) };
		}
	}
};

CTM.FileMG2Header = function (stream) {
	stream.readInt32(); //magic "MG2H"
	this.vertexPrecision = stream.readFloat32();
	this.normalPrecision = stream.readFloat32();
	this.lowerBoundx = stream.readFloat32();
	this.lowerBoundy = stream.readFloat32();
	this.lowerBoundz = stream.readFloat32();
	this.higherBoundx = stream.readFloat32();
	this.higherBoundy = stream.readFloat32();
	this.higherBoundz = stream.readFloat32();
	this.divx = stream.readInt32();
	this.divy = stream.readInt32();
	this.divz = stream.readInt32();

	this.sizex = (this.higherBoundx - this.lowerBoundx) / this.divx;
	this.sizey = (this.higherBoundy - this.lowerBoundy) / this.divy;
	this.sizez = (this.higherBoundz - this.lowerBoundz) / this.divz;
};

CTM.ReaderRAW = function () {};

CTM.ReaderRAW.prototype.read = function (stream, body) {
	this.readIndices(stream, body.indices);
	this.readVertices(stream, body.vertices);

	if (body.normals) {
		this.readNormals(stream, body.normals);
	}
	if (body.uvMaps) {
		this.readUVMaps(stream, body.uvMaps);
	}
	if (body.attrMaps) {
		this.readAttrMaps(stream, body.attrMaps);
	}
};

CTM.ReaderRAW.prototype.readIndices = function (stream, indices) {
	stream.readInt32(); //magic "INDX"
	stream.readArrayInt32(indices);
};

CTM.ReaderRAW.prototype.readVertices = function (stream, vertices) {
	stream.readInt32(); //magic "VERT"
	stream.readArrayFloat32(vertices);
};

CTM.ReaderRAW.prototype.readNormals = function (stream, normals) {
	stream.readInt32(); //magic "NORM"
	stream.readArrayFloat32(normals);
};

CTM.ReaderRAW.prototype.readUVMaps = function (stream, uvMaps) {
	var i = 0;
	for (; i < uvMaps.length; ++i) {
		stream.readInt32(); //magic "TEXC"

		uvMaps[i].name = stream.readString();
		uvMaps[i].filename = stream.readString();
		stream.readArrayFloat32(uvMaps[i].uv);
	}
};

CTM.ReaderRAW.prototype.readAttrMaps = function (stream, attrMaps) {
	var i = 0;
	for (; i < attrMaps.length; ++i) {
		stream.readInt32(); //magic "ATTR"

		attrMaps[i].name = stream.readString();
		stream.readArrayFloat32(attrMaps[i].attr);
	}
};

CTM.ReaderMG1 = function () {};

CTM.ReaderMG1.prototype.read = function (stream, body) {
	this.readIndices(stream, body.indices);
	this.readVertices(stream, body.vertices);

	if (body.normals) {
		this.readNormals(stream, body.normals);
	}
	if (body.uvMaps) {
		this.readUVMaps(stream, body.uvMaps);
	}
	if (body.attrMaps) {
		this.readAttrMaps(stream, body.attrMaps);
	}
};

CTM.ReaderMG1.prototype.readIndices = function (stream, indices) {
	stream.readInt32(); //magic "INDX"
	stream.readInt32(); //packed size

	var interleaved = new CTM.InterleavedStream(indices, 3);
	LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

	CTM.restoreIndices(indices, indices.length);
};

CTM.ReaderMG1.prototype.readVertices = function (stream, vertices) {
	stream.readInt32(); //magic "VERT"
	stream.readInt32(); //packed size

	var interleaved = new CTM.InterleavedStream(vertices, 1);
	LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
};

CTM.ReaderMG1.prototype.readNormals = function (stream, normals) {
	stream.readInt32(); //magic "NORM"
	stream.readInt32(); //packed size

	var interleaved = new CTM.InterleavedStream(normals, 3);
	LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
};

CTM.ReaderMG1.prototype.readUVMaps = function (stream, uvMaps) {
	var i = 0;
	for (; i < uvMaps.length; ++i) {
		stream.readInt32(); //magic "TEXC"

		uvMaps[i].name = stream.readString();
		uvMaps[i].filename = stream.readString();

		stream.readInt32(); //packed size

		var interleaved = new CTM.InterleavedStream(uvMaps[i].uv, 2);
		LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
	}
};

CTM.ReaderMG1.prototype.readAttrMaps = function (stream, attrMaps) {
	var i = 0;
	for (; i < attrMaps.length; ++i) {
		stream.readInt32(); //magic "ATTR"

		attrMaps[i].name = stream.readString();

		stream.readInt32(); //packed size

		var interleaved = new CTM.InterleavedStream(attrMaps[i].attr, 4);
		LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
	}
};

CTM.ReaderMG2 = function () {};

CTM.ReaderMG2.prototype.read = function (stream, body) {
	this.MG2Header = new CTM.FileMG2Header(stream);

	this.readVertices(stream, body.vertices);
	this.readIndices(stream, body.indices);

	if (body.normals) {
		this.readNormals(stream, body);
	}
	if (body.uvMaps) {
		this.readUVMaps(stream, body.uvMaps);
	}
	if (body.attrMaps) {
		this.readAttrMaps(stream, body.attrMaps);
	}
};

CTM.ReaderMG2.prototype.readVertices = function (stream, vertices) {
	stream.readInt32(); //magic "VERT"
	stream.readInt32(); //packed size

	var interleaved = new CTM.InterleavedStream(vertices, 3);
	LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

	var gridIndices = this.readGridIndices(stream, vertices);

	CTM.restoreVertices(vertices, this.MG2Header, gridIndices, this.MG2Header.vertexPrecision);
};

CTM.ReaderMG2.prototype.readGridIndices = function (stream, vertices) {
	stream.readInt32(); //magic "GIDX"
	stream.readInt32(); //packed size

	var gridIndices = new Uint32Array(vertices.length / 3);

	var interleaved = new CTM.InterleavedStream(gridIndices, 1);
	LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

	CTM.restoreGridIndices(gridIndices, gridIndices.length);

	return gridIndices;
};

CTM.ReaderMG2.prototype.readIndices = function (stream, indices) {
	stream.readInt32(); //magic "INDX"
	stream.readInt32(); //packed size

	var interleaved = new CTM.InterleavedStream(indices, 3);
	LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

	CTM.restoreIndices(indices, indices.length);
};

CTM.ReaderMG2.prototype.readNormals = function (stream, body) {
	stream.readInt32(); //magic "NORM"
	stream.readInt32(); //packed size

	var interleaved = new CTM.InterleavedStream(body.normals, 3);
	LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

	var smooth = CTM.calcSmoothNormals(body.indices, body.vertices);

	CTM.restoreNormals(body.normals, smooth, this.MG2Header.normalPrecision);
};

CTM.ReaderMG2.prototype.readUVMaps = function (stream, uvMaps) {
	var i = 0;
	for (; i < uvMaps.length; ++i) {
		stream.readInt32(); //magic "TEXC"

		uvMaps[i].name = stream.readString();
		uvMaps[i].filename = stream.readString();

		var precision = stream.readFloat32();

		stream.readInt32(); //packed size

		var interleaved = new CTM.InterleavedStream(uvMaps[i].uv, 2);
		LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

		CTM.restoreMap(uvMaps[i].uv, 2, precision);
	}
};

CTM.ReaderMG2.prototype.readAttrMaps = function (stream, attrMaps) {
	var i = 0;
	for (; i < attrMaps.length; ++i) {
		stream.readInt32(); //magic "ATTR"

		attrMaps[i].name = stream.readString();

		var precision = stream.readFloat32();

		stream.readInt32(); //packed size

		var interleaved = new CTM.InterleavedStream(attrMaps[i].attr, 4);
		LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

		CTM.restoreMap(attrMaps[i].attr, 4, precision);
	}
};

CTM.restoreIndices = function (indices, len) {
	var i = 3;
	if (len > 0) {
		indices[2] += indices[0];
		indices[1] += indices[0];
	}
	for (; i < len; i += 3) {
		indices[i] += indices[i - 3];

		if (indices[i] === indices[i - 3]) {
			indices[i + 1] += indices[i - 2];
		} else {
			indices[i + 1] += indices[i];
		}

		indices[i + 2] += indices[i];
	}
};

CTM.restoreGridIndices = function (gridIndices, len) {
	var i = 1;
	for (; i < len; ++i) {
		gridIndices[i] += gridIndices[i - 1];
	}
};

CTM.restoreVertices = function (vertices, grid, gridIndices, precision) {
	var gridIdx,
	    delta,
	    x,
	    y,
	    z,
	    intVertices = new Uint32Array(vertices.buffer, vertices.byteOffset, vertices.length),
	    ydiv = grid.divx,
	    zdiv = ydiv * grid.divy,
	    prevGridIdx = 0x7fffffff,
	    prevDelta = 0,
	    i = 0,
	    j = 0,
	    len = gridIndices.length;

	for (; i < len; j += 3) {
		x = gridIdx = gridIndices[i++];

		z = ~~(x / zdiv);
		x -= ~~(z * zdiv);
		y = ~~(x / ydiv);
		x -= ~~(y * ydiv);

		delta = intVertices[j];
		if (gridIdx === prevGridIdx) {
			delta += prevDelta;
		}

		vertices[j] = grid.lowerBoundx + x * grid.sizex + precision * delta;
		vertices[j + 1] = grid.lowerBoundy + y * grid.sizey + precision * intVertices[j + 1];
		vertices[j + 2] = grid.lowerBoundz + z * grid.sizez + precision * intVertices[j + 2];

		prevGridIdx = gridIdx;
		prevDelta = delta;
	}
};

CTM.restoreNormals = function (normals, smooth, precision) {
	var ro,
	    phi,
	    theta,
	    sinPhi,
	    nx,
	    ny,
	    nz,
	    by,
	    bz,
	    len,
	    intNormals = new Uint32Array(normals.buffer, normals.byteOffset, normals.length),
	    i = 0,
	    k = normals.length,
	    PI_DIV_2 = 3.141592653589793238462643 * 0.5;

	for (; i < k; i += 3) {
		ro = intNormals[i] * precision;
		phi = intNormals[i + 1];

		if (phi === 0) {
			normals[i] = smooth[i] * ro;
			normals[i + 1] = smooth[i + 1] * ro;
			normals[i + 2] = smooth[i + 2] * ro;
		} else {

			if (phi <= 4) {
				theta = (intNormals[i + 2] - 2) * PI_DIV_2;
			} else {
				theta = (intNormals[i + 2] * 4 / phi - 2) * PI_DIV_2;
			}

			phi *= precision * PI_DIV_2;
			sinPhi = ro * Math.sin(phi);

			nx = sinPhi * Math.cos(theta);
			ny = sinPhi * Math.sin(theta);
			nz = ro * Math.cos(phi);

			bz = smooth[i + 1];
			by = smooth[i] - smooth[i + 2];

			len = Math.sqrt(2 * bz * bz + by * by);
			if (len > 1e-20) {
				by /= len;
				bz /= len;
			}

			normals[i] = smooth[i] * nz + (smooth[i + 1] * bz - smooth[i + 2] * by) * ny - bz * nx;
			normals[i + 1] = smooth[i + 1] * nz - (smooth[i + 2] + smooth[i]) * bz * ny + by * nx;
			normals[i + 2] = smooth[i + 2] * nz + (smooth[i] * by + smooth[i + 1] * bz) * ny + bz * nx;
		}
	}
};

CTM.restoreMap = function (map, count, precision) {
	var delta,
	    value,
	    intMap = new Uint32Array(map.buffer, map.byteOffset, map.length),
	    i = 0,
	    j,
	    len = map.length;

	for (; i < count; ++i) {
		delta = 0;

		for (j = i; j < len; j += count) {
			value = intMap[j];

			delta += value & 1 ? -(value + 1 >> 1) : value >> 1;

			map[j] = delta * precision;
		}
	}
};

CTM.calcSmoothNormals = function (indices, vertices) {
	var smooth = new Float32Array(vertices.length),
	    indx,
	    indy,
	    indz,
	    nx,
	    ny,
	    nz,
	    v1x,
	    v1y,
	    v1z,
	    v2x,
	    v2y,
	    v2z,
	    len,
	    i,
	    k;

	for (i = 0, k = indices.length; i < k;) {
		indx = indices[i++] * 3;
		indy = indices[i++] * 3;
		indz = indices[i++] * 3;

		v1x = vertices[indy] - vertices[indx];
		v2x = vertices[indz] - vertices[indx];
		v1y = vertices[indy + 1] - vertices[indx + 1];
		v2y = vertices[indz + 1] - vertices[indx + 1];
		v1z = vertices[indy + 2] - vertices[indx + 2];
		v2z = vertices[indz + 2] - vertices[indx + 2];

		nx = v1y * v2z - v1z * v2y;
		ny = v1z * v2x - v1x * v2z;
		nz = v1x * v2y - v1y * v2x;

		len = Math.sqrt(nx * nx + ny * ny + nz * nz);
		if (len > 1e-10) {
			nx /= len;
			ny /= len;
			nz /= len;
		}

		smooth[indx] += nx;
		smooth[indx + 1] += ny;
		smooth[indx + 2] += nz;
		smooth[indy] += nx;
		smooth[indy + 1] += ny;
		smooth[indy + 2] += nz;
		smooth[indz] += nx;
		smooth[indz + 1] += ny;
		smooth[indz + 2] += nz;
	}

	for (i = 0, k = smooth.length; i < k; i += 3) {
		len = Math.sqrt(smooth[i] * smooth[i] + smooth[i + 1] * smooth[i + 1] + smooth[i + 2] * smooth[i + 2]);

		if (len > 1e-10) {
			smooth[i] /= len;
			smooth[i + 1] /= len;
			smooth[i + 2] /= len;
		}
	}

	return smooth;
};

CTM.isLittleEndian = function () {
	var buffer = new ArrayBuffer(2),
	    bytes = new Uint8Array(buffer),
	    ints = new Uint16Array(buffer);

	bytes[0] = 1;

	return ints[0] === 1;
}();

CTM.InterleavedStream = function (data, count) {
	this.data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
	this.offset = CTM.isLittleEndian ? 3 : 0;
	this.count = count * 4;
	this.len = this.data.length;
};

CTM.InterleavedStream.prototype.writeByte = function (value) {
	this.data[this.offset] = value;

	this.offset += this.count;
	if (this.offset >= this.len) {

		this.offset -= this.len - 4;
		if (this.offset >= this.count) {

			this.offset -= this.count + (CTM.isLittleEndian ? 1 : -1);
		}
	}
};

CTM.Stream = function (data) {
	this.data = data;
	this.offset = 0;
};

CTM.Stream.prototype.TWO_POW_MINUS23 = Math.pow(2, -23);

CTM.Stream.prototype.TWO_POW_MINUS126 = Math.pow(2, -126);

CTM.Stream.prototype.readByte = function () {
	return this.data[this.offset++] & 0xff;
};

CTM.Stream.prototype.readInt32 = function () {
	var i = this.readByte();
	i |= this.readByte() << 8;
	i |= this.readByte() << 16;
	return i | this.readByte() << 24;
};

CTM.Stream.prototype.readFloat32 = function () {
	var m = this.readByte();
	m += this.readByte() << 8;

	var b1 = this.readByte();
	var b2 = this.readByte();

	m += (b1 & 0x7f) << 16;
	var e = (b2 & 0x7f) << 1 | (b1 & 0x80) >>> 7;
	var s = b2 & 0x80 ? -1 : 1;

	if (e === 255) {
		return m !== 0 ? NaN : s * Infinity;
	}
	if (e > 0) {
		return s * (1 + m * this.TWO_POW_MINUS23) * Math.pow(2, e - 127);
	}
	if (m !== 0) {
		return s * m * this.TWO_POW_MINUS126;
	}
	return s * 0;
};

CTM.Stream.prototype.readString = function () {
	var len = this.readInt32();

	this.offset += len;

	return String.fromCharCode.apply(null, this.data.subarray(this.offset - len, this.offset));
};

CTM.Stream.prototype.readArrayInt32 = function (array) {
	var i = 0,
	    len = array.length;

	while (i < len) {
		array[i++] = this.readInt32();
	}

	return array;
};

CTM.Stream.prototype.readArrayFloat32 = function (array) {
	var i = 0,
	    len = array.length;

	while (i < len) {
		array[i++] = this.readFloat32();
	}

	return array;
};
"use strict";

/**
 * Loader for CTM encoded models generated by OpenCTM tools:
 *	http://openctm.sourceforge.net/
 *
 * Uses js-openctm library by Juan Mellado
 *	http://code.google.com/p/js-openctm/
 *
 * @author alteredq / http://alteredqualia.com/
 */

THREE.CTMLoader = function () {

	THREE.Loader.call(this);
};

THREE.CTMLoader.prototype = Object.create(THREE.Loader.prototype);
THREE.CTMLoader.prototype.constructor = THREE.CTMLoader;

// Load multiple CTM parts defined in JSON

THREE.CTMLoader.prototype.loadParts = function (url, callback, parameters) {

	parameters = parameters || {};

	var scope = this;

	var xhr = new XMLHttpRequest();

	var basePath = parameters.basePath ? parameters.basePath : this.extractUrlBase(url);

	xhr.onreadystatechange = function () {

		if (xhr.readyState === 4) {

			if (xhr.status === 200 || xhr.status === 0) {
				var callbackFinal = function callbackFinal(geometry) {

					counter += 1;

					geometries.push(geometry);

					if (counter === jsonObject.offsets.length) {

						callback(geometries, materials);
					}
				};

				// init materials

				var jsonObject = JSON.parse(xhr.responseText);

				var materials = [],
				    geometries = [],
				    counter = 0;

				for (var i = 0; i < jsonObject.materials.length; i++) {

					materials[i] = scope.createMaterial(jsonObject.materials[i], basePath);
				}

				// load joined CTM file

				var partUrl = basePath + jsonObject.data;
				var parametersPart = { useWorker: parameters.useWorker, worker: parameters.worker, offsets: jsonObject.offsets };
				scope.load(partUrl, callbackFinal, parametersPart);
			}
		}
	};

	xhr.open("GET", url, true);
	xhr.setRequestHeader("Content-Type", "text/plain");
	xhr.send(null);
};

// Load CTMLoader compressed models
//	- parameters
//		- url (required)
//		- callback (required)

THREE.CTMLoader.prototype.load = function (url, callback, parameters) {

	parameters = parameters || {};

	var scope = this;

	var offsets = parameters.offsets !== undefined ? parameters.offsets : [0];

	var xhr = new XMLHttpRequest(),
	    callbackProgress = null;

	var length = 0;

	xhr.onreadystatechange = function () {

		if (xhr.readyState === 4) {

			if (xhr.status === 200 || xhr.status === 0) {

				var binaryData = new Uint8Array(xhr.response);

				var s = Date.now();

				if (parameters.useWorker) {

					var worker = parameters.worker || new Worker('js/loaders/ctm/CTMWorker.js');

					worker.onmessage = function (event) {

						var files = event.data;

						for (var i = 0; i < files.length; i++) {

							var ctmFile = files[i];

							var e1 = Date.now();
							// console.log( "CTM data parse time [worker]: " + (e1-s) + " ms" );

							scope.createModel(ctmFile, callback);

							var e = Date.now();
							console.log("model load time [worker]: " + (e - e1) + " ms, total: " + (e - s));
						}
					};

					worker.postMessage({ "data": binaryData, "offsets": offsets }, [binaryData.buffer]);
				} else {

					for (var i = 0; i < offsets.length; i++) {

						var stream = new CTM.Stream(binaryData);
						stream.offset = offsets[i];

						var ctmFile = new CTM.File(stream);

						scope.createModel(ctmFile, callback);
					}

					//var e = Date.now();
					//console.log( "CTM data parse time [inline]: " + (e-s) + " ms" );
				}
			} else {

				console.error("Couldn't load [" + url + "] [" + xhr.status + "]");
			}
		} else if (xhr.readyState === 3) {

			if (callbackProgress) {

				if (length === 0) {

					length = xhr.getResponseHeader("Content-Length");
				}

				callbackProgress({ total: length, loaded: xhr.responseText.length });
			}
		} else if (xhr.readyState === 2) {

			length = xhr.getResponseHeader("Content-Length");
		}
	};

	xhr.open("GET", url, true);
	xhr.responseType = "arraybuffer";

	xhr.send(null);
};

THREE.CTMLoader.prototype.createModel = function (file, callback) {

	var Model = function Model() {

		THREE.BufferGeometry.call(this);

		this.materials = [];

		var indices = file.body.indices;
		var positions = file.body.vertices;
		var normals = file.body.normals;

		var uvs, colors;

		var uvMaps = file.body.uvMaps;

		if (uvMaps !== undefined && uvMaps.length > 0) {

			uvs = uvMaps[0].uv;
		}

		var attrMaps = file.body.attrMaps;

		if (attrMaps !== undefined && attrMaps.length > 0 && attrMaps[0].name === 'Color') {

			colors = attrMaps[0].attr;
		}

		this.setIndex(new THREE.BufferAttribute(indices, 1));
		this.addAttribute('position', new THREE.BufferAttribute(positions, 3));

		if (normals !== undefined) {

			this.addAttribute('normal', new THREE.BufferAttribute(normals, 3));
		}

		if (uvs !== undefined) {

			this.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));
		}

		if (colors !== undefined) {

			this.addAttribute('color', new THREE.BufferAttribute(colors, 4));
		}
	};

	Model.prototype = Object.create(THREE.BufferGeometry.prototype);
	Model.prototype.constructor = Model;

	var geometry = new Model();

	// compute vertex normals if not present in the CTM model
	if (geometry.attributes.normal === undefined) {

		geometry.computeVertexNormals();
	}

	callback(geometry);
};
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var FocusbtnsController = function () {
    function FocusbtnsController() {
        _classCallCheck(this, FocusbtnsController);
    }

    _createClass(FocusbtnsController, [{
        key: 'testMethod',
        value: function testMethod() {
            alert('test method works!');
        }
    }]);

    return FocusbtnsController;
}();

exports.default = FocusbtnsController;
'use strict';

var _angular = require('angular');

var _angular2 = _interopRequireDefault(_angular);

var _FocusbtnsController = require('./FocusbtnsController');

var _FocusbtnsController2 = _interopRequireDefault(_FocusbtnsController);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var LZMA = LZMA || {};

// browserify support
if ((typeof module === "undefined" ? "undefined" : _typeof(module)) === 'object') {

	module.exports = LZMA;
}

LZMA.OutWindow = function () {
	this._windowSize = 0;
};

LZMA.OutWindow.prototype.create = function (windowSize) {
	if (!this._buffer || this._windowSize !== windowSize) {
		this._buffer = [];
	}
	this._windowSize = windowSize;
	this._pos = 0;
	this._streamPos = 0;
};

LZMA.OutWindow.prototype.flush = function () {
	var size = this._pos - this._streamPos;
	if (size !== 0) {
		while (size--) {
			this._stream.writeByte(this._buffer[this._streamPos++]);
		}
		if (this._pos >= this._windowSize) {
			this._pos = 0;
		}
		this._streamPos = this._pos;
	}
};

LZMA.OutWindow.prototype.releaseStream = function () {
	this.flush();
	this._stream = null;
};

LZMA.OutWindow.prototype.setStream = function (stream) {
	this.releaseStream();
	this._stream = stream;
};

LZMA.OutWindow.prototype.init = function (solid) {
	if (!solid) {
		this._streamPos = 0;
		this._pos = 0;
	}
};

LZMA.OutWindow.prototype.copyBlock = function (distance, len) {
	var pos = this._pos - distance - 1;
	if (pos < 0) {
		pos += this._windowSize;
	}
	while (len--) {
		if (pos >= this._windowSize) {
			pos = 0;
		}
		this._buffer[this._pos++] = this._buffer[pos++];
		if (this._pos >= this._windowSize) {
			this.flush();
		}
	}
};

LZMA.OutWindow.prototype.putByte = function (b) {
	this._buffer[this._pos++] = b;
	if (this._pos >= this._windowSize) {
		this.flush();
	}
};

LZMA.OutWindow.prototype.getByte = function (distance) {
	var pos = this._pos - distance - 1;
	if (pos < 0) {
		pos += this._windowSize;
	}
	return this._buffer[pos];
};

LZMA.RangeDecoder = function () {};

LZMA.RangeDecoder.prototype.setStream = function (stream) {
	this._stream = stream;
};

LZMA.RangeDecoder.prototype.releaseStream = function () {
	this._stream = null;
};

LZMA.RangeDecoder.prototype.init = function () {
	var i = 5;

	this._code = 0;
	this._range = -1;

	while (i--) {
		this._code = this._code << 8 | this._stream.readByte();
	}
};

LZMA.RangeDecoder.prototype.decodeDirectBits = function (numTotalBits) {
	var result = 0,
	    i = numTotalBits,
	    t;

	while (i--) {
		this._range >>>= 1;
		t = this._code - this._range >>> 31;
		this._code -= this._range & t - 1;
		result = result << 1 | 1 - t;

		if ((this._range & 0xff000000) === 0) {
			this._code = this._code << 8 | this._stream.readByte();
			this._range <<= 8;
		}
	}

	return result;
};

LZMA.RangeDecoder.prototype.decodeBit = function (probs, index) {
	var prob = probs[index],
	    newBound = (this._range >>> 11) * prob;

	if ((this._code ^ 0x80000000) < (newBound ^ 0x80000000)) {
		this._range = newBound;
		probs[index] += 2048 - prob >>> 5;
		if ((this._range & 0xff000000) === 0) {
			this._code = this._code << 8 | this._stream.readByte();
			this._range <<= 8;
		}
		return 0;
	}

	this._range -= newBound;
	this._code -= newBound;
	probs[index] -= prob >>> 5;
	if ((this._range & 0xff000000) === 0) {
		this._code = this._code << 8 | this._stream.readByte();
		this._range <<= 8;
	}
	return 1;
};

LZMA.initBitModels = function (probs, len) {
	while (len--) {
		probs[len] = 1024;
	}
};

LZMA.BitTreeDecoder = function (numBitLevels) {
	this._models = [];
	this._numBitLevels = numBitLevels;
};

LZMA.BitTreeDecoder.prototype.init = function () {
	LZMA.initBitModels(this._models, 1 << this._numBitLevels);
};

LZMA.BitTreeDecoder.prototype.decode = function (rangeDecoder) {
	var m = 1,
	    i = this._numBitLevels;

	while (i--) {
		m = m << 1 | rangeDecoder.decodeBit(this._models, m);
	}
	return m - (1 << this._numBitLevels);
};

LZMA.BitTreeDecoder.prototype.reverseDecode = function (rangeDecoder) {
	var m = 1,
	    symbol = 0,
	    i = 0,
	    bit;

	for (; i < this._numBitLevels; ++i) {
		bit = rangeDecoder.decodeBit(this._models, m);
		m = m << 1 | bit;
		symbol |= bit << i;
	}
	return symbol;
};

LZMA.reverseDecode2 = function (models, startIndex, rangeDecoder, numBitLevels) {
	var m = 1,
	    symbol = 0,
	    i = 0,
	    bit;

	for (; i < numBitLevels; ++i) {
		bit = rangeDecoder.decodeBit(models, startIndex + m);
		m = m << 1 | bit;
		symbol |= bit << i;
	}
	return symbol;
};

LZMA.LenDecoder = function () {
	this._choice = [];
	this._lowCoder = [];
	this._midCoder = [];
	this._highCoder = new LZMA.BitTreeDecoder(8);
	this._numPosStates = 0;
};

LZMA.LenDecoder.prototype.create = function (numPosStates) {
	for (; this._numPosStates < numPosStates; ++this._numPosStates) {
		this._lowCoder[this._numPosStates] = new LZMA.BitTreeDecoder(3);
		this._midCoder[this._numPosStates] = new LZMA.BitTreeDecoder(3);
	}
};

LZMA.LenDecoder.prototype.init = function () {
	var i = this._numPosStates;
	LZMA.initBitModels(this._choice, 2);
	while (i--) {
		this._lowCoder[i].init();
		this._midCoder[i].init();
	}
	this._highCoder.init();
};

LZMA.LenDecoder.prototype.decode = function (rangeDecoder, posState) {
	if (rangeDecoder.decodeBit(this._choice, 0) === 0) {
		return this._lowCoder[posState].decode(rangeDecoder);
	}
	if (rangeDecoder.decodeBit(this._choice, 1) === 0) {
		return 8 + this._midCoder[posState].decode(rangeDecoder);
	}
	return 16 + this._highCoder.decode(rangeDecoder);
};

LZMA.Decoder2 = function () {
	this._decoders = [];
};

LZMA.Decoder2.prototype.init = function () {
	LZMA.initBitModels(this._decoders, 0x300);
};

LZMA.Decoder2.prototype.decodeNormal = function (rangeDecoder) {
	var symbol = 1;

	do {
		symbol = symbol << 1 | rangeDecoder.decodeBit(this._decoders, symbol);
	} while (symbol < 0x100);

	return symbol & 0xff;
};

LZMA.Decoder2.prototype.decodeWithMatchByte = function (rangeDecoder, matchByte) {
	var symbol = 1,
	    matchBit,
	    bit;

	do {
		matchBit = matchByte >> 7 & 1;
		matchByte <<= 1;
		bit = rangeDecoder.decodeBit(this._decoders, (1 + matchBit << 8) + symbol);
		symbol = symbol << 1 | bit;
		if (matchBit !== bit) {
			while (symbol < 0x100) {
				symbol = symbol << 1 | rangeDecoder.decodeBit(this._decoders, symbol);
			}
			break;
		}
	} while (symbol < 0x100);

	return symbol & 0xff;
};

LZMA.LiteralDecoder = function () {};

LZMA.LiteralDecoder.prototype.create = function (numPosBits, numPrevBits) {
	var i;

	if (this._coders && this._numPrevBits === numPrevBits && this._numPosBits === numPosBits) {
		return;
	}
	this._numPosBits = numPosBits;
	this._posMask = (1 << numPosBits) - 1;
	this._numPrevBits = numPrevBits;

	this._coders = [];

	i = 1 << this._numPrevBits + this._numPosBits;
	while (i--) {
		this._coders[i] = new LZMA.Decoder2();
	}
};

LZMA.LiteralDecoder.prototype.init = function () {
	var i = 1 << this._numPrevBits + this._numPosBits;
	while (i--) {
		this._coders[i].init();
	}
};

LZMA.LiteralDecoder.prototype.getDecoder = function (pos, prevByte) {
	return this._coders[((pos & this._posMask) << this._numPrevBits) + ((prevByte & 0xff) >>> 8 - this._numPrevBits)];
};

LZMA.Decoder = function () {
	this._outWindow = new LZMA.OutWindow();
	this._rangeDecoder = new LZMA.RangeDecoder();
	this._isMatchDecoders = [];
	this._isRepDecoders = [];
	this._isRepG0Decoders = [];
	this._isRepG1Decoders = [];
	this._isRepG2Decoders = [];
	this._isRep0LongDecoders = [];
	this._posSlotDecoder = [];
	this._posDecoders = [];
	this._posAlignDecoder = new LZMA.BitTreeDecoder(4);
	this._lenDecoder = new LZMA.LenDecoder();
	this._repLenDecoder = new LZMA.LenDecoder();
	this._literalDecoder = new LZMA.LiteralDecoder();
	this._dictionarySize = -1;
	this._dictionarySizeCheck = -1;

	this._posSlotDecoder[0] = new LZMA.BitTreeDecoder(6);
	this._posSlotDecoder[1] = new LZMA.BitTreeDecoder(6);
	this._posSlotDecoder[2] = new LZMA.BitTreeDecoder(6);
	this._posSlotDecoder[3] = new LZMA.BitTreeDecoder(6);
};

LZMA.Decoder.prototype.setDictionarySize = function (dictionarySize) {
	if (dictionarySize < 0) {
		return false;
	}
	if (this._dictionarySize !== dictionarySize) {
		this._dictionarySize = dictionarySize;
		this._dictionarySizeCheck = Math.max(this._dictionarySize, 1);
		this._outWindow.create(Math.max(this._dictionarySizeCheck, 4096));
	}
	return true;
};

LZMA.Decoder.prototype.setLcLpPb = function (lc, lp, pb) {
	var numPosStates = 1 << pb;

	if (lc > 8 || lp > 4 || pb > 4) {
		return false;
	}

	this._literalDecoder.create(lp, lc);

	this._lenDecoder.create(numPosStates);
	this._repLenDecoder.create(numPosStates);
	this._posStateMask = numPosStates - 1;

	return true;
};

LZMA.Decoder.prototype.init = function () {
	var i = 4;

	this._outWindow.init(false);

	LZMA.initBitModels(this._isMatchDecoders, 192);
	LZMA.initBitModels(this._isRep0LongDecoders, 192);
	LZMA.initBitModels(this._isRepDecoders, 12);
	LZMA.initBitModels(this._isRepG0Decoders, 12);
	LZMA.initBitModels(this._isRepG1Decoders, 12);
	LZMA.initBitModels(this._isRepG2Decoders, 12);
	LZMA.initBitModels(this._posDecoders, 114);

	this._literalDecoder.init();

	while (i--) {
		this._posSlotDecoder[i].init();
	}

	this._lenDecoder.init();
	this._repLenDecoder.init();
	this._posAlignDecoder.init();
	this._rangeDecoder.init();
};

LZMA.Decoder.prototype.decode = function (inStream, outStream, outSize) {
	var state = 0,
	    rep0 = 0,
	    rep1 = 0,
	    rep2 = 0,
	    rep3 = 0,
	    nowPos64 = 0,
	    prevByte = 0,
	    posState,
	    decoder2,
	    len,
	    distance,
	    posSlot,
	    numDirectBits;

	this._rangeDecoder.setStream(inStream);
	this._outWindow.setStream(outStream);

	this.init();

	while (outSize < 0 || nowPos64 < outSize) {
		posState = nowPos64 & this._posStateMask;

		if (this._rangeDecoder.decodeBit(this._isMatchDecoders, (state << 4) + posState) === 0) {
			decoder2 = this._literalDecoder.getDecoder(nowPos64++, prevByte);

			if (state >= 7) {
				prevByte = decoder2.decodeWithMatchByte(this._rangeDecoder, this._outWindow.getByte(rep0));
			} else {
				prevByte = decoder2.decodeNormal(this._rangeDecoder);
			}
			this._outWindow.putByte(prevByte);

			state = state < 4 ? 0 : state - (state < 10 ? 3 : 6);
		} else {

			if (this._rangeDecoder.decodeBit(this._isRepDecoders, state) === 1) {
				len = 0;
				if (this._rangeDecoder.decodeBit(this._isRepG0Decoders, state) === 0) {
					if (this._rangeDecoder.decodeBit(this._isRep0LongDecoders, (state << 4) + posState) === 0) {
						state = state < 7 ? 9 : 11;
						len = 1;
					}
				} else {
					if (this._rangeDecoder.decodeBit(this._isRepG1Decoders, state) === 0) {
						distance = rep1;
					} else {
						if (this._rangeDecoder.decodeBit(this._isRepG2Decoders, state) === 0) {
							distance = rep2;
						} else {
							distance = rep3;
							rep3 = rep2;
						}
						rep2 = rep1;
					}
					rep1 = rep0;
					rep0 = distance;
				}
				if (len === 0) {
					len = 2 + this._repLenDecoder.decode(this._rangeDecoder, posState);
					state = state < 7 ? 8 : 11;
				}
			} else {
				rep3 = rep2;
				rep2 = rep1;
				rep1 = rep0;

				len = 2 + this._lenDecoder.decode(this._rangeDecoder, posState);
				state = state < 7 ? 7 : 10;

				posSlot = this._posSlotDecoder[len <= 5 ? len - 2 : 3].decode(this._rangeDecoder);
				if (posSlot >= 4) {

					numDirectBits = (posSlot >> 1) - 1;
					rep0 = (2 | posSlot & 1) << numDirectBits;

					if (posSlot < 14) {
						rep0 += LZMA.reverseDecode2(this._posDecoders, rep0 - posSlot - 1, this._rangeDecoder, numDirectBits);
					} else {
						rep0 += this._rangeDecoder.decodeDirectBits(numDirectBits - 4) << 4;
						rep0 += this._posAlignDecoder.reverseDecode(this._rangeDecoder);
						if (rep0 < 0) {
							if (rep0 === -1) {
								break;
							}
							return false;
						}
					}
				} else {
					rep0 = posSlot;
				}
			}

			if (rep0 >= nowPos64 || rep0 >= this._dictionarySizeCheck) {
				return false;
			}

			this._outWindow.copyBlock(rep0, len);
			nowPos64 += len;
			prevByte = this._outWindow.getByte(0);
		}
	}

	this._outWindow.flush();
	this._outWindow.releaseStream();
	this._rangeDecoder.releaseStream();

	return true;
};

LZMA.Decoder.prototype.setDecoderProperties = function (properties) {
	var value, lc, lp, pb, dictionarySize;

	if (properties.size < 5) {
		return false;
	}

	value = properties.readByte();
	lc = value % 9;
	value = ~~(value / 9);
	lp = value % 5;
	pb = ~~(value / 5);

	if (!this.setLcLpPb(lc, lp, pb)) {
		return false;
	}

	dictionarySize = properties.readByte();
	dictionarySize |= properties.readByte() << 8;
	dictionarySize |= properties.readByte() << 16;
	dictionarySize += properties.readByte() * 16777216;

	return this.setDictionarySize(dictionarySize);
};

LZMA.decompress = function (properties, inStream, outStream, outSize) {
	var decoder = new LZMA.Decoder();

	if (!decoder.setDecoderProperties(properties)) {
		throw "Incorrect stream properties";
	}

	if (!decoder.decode(inStream, outStream, outSize)) {
		throw "Error in data stream";
	}

	return true;
};
'use strict';

/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.OBJLoader = function () {

	// o object_name | g group_name
	var object_pattern = /^[og]\s*(.+)?/;
	// mtllib file_reference
	var material_library_pattern = /^mtllib /;
	// usemtl material_name
	var material_use_pattern = /^usemtl /;

	function ParserState() {

		var state = {
			objects: [],
			object: {},

			vertices: [],
			normals: [],
			uvs: [],

			materialLibraries: [],

			startObject: function startObject(name, fromDeclaration) {

				// If the current object (initial from reset) is not from a g/o declaration in the parsed
				// file. We need to use it for the first parsed g/o to keep things in sync.
				if (this.object && this.object.fromDeclaration === false) {

					this.object.name = name;
					this.object.fromDeclaration = fromDeclaration !== false;
					return;
				}

				var previousMaterial = this.object && typeof this.object.currentMaterial === 'function' ? this.object.currentMaterial() : undefined;

				if (this.object && typeof this.object._finalize === 'function') {

					this.object._finalize(true);
				}

				this.object = {
					name: name || '',
					fromDeclaration: fromDeclaration !== false,

					geometry: {
						vertices: [],
						normals: [],
						uvs: []
					},
					materials: [],
					smooth: true,

					startMaterial: function startMaterial(name, libraries) {

						var previous = this._finalize(false);

						// New usemtl declaration overwrites an inherited material, except if faces were declared
						// after the material, then it must be preserved for proper MultiMaterial continuation.
						if (previous && (previous.inherited || previous.groupCount <= 0)) {

							this.materials.splice(previous.index, 1);
						}

						var material = {
							index: this.materials.length,
							name: name || '',
							mtllib: Array.isArray(libraries) && libraries.length > 0 ? libraries[libraries.length - 1] : '',
							smooth: previous !== undefined ? previous.smooth : this.smooth,
							groupStart: previous !== undefined ? previous.groupEnd : 0,
							groupEnd: -1,
							groupCount: -1,
							inherited: false,

							clone: function clone(index) {
								var cloned = {
									index: typeof index === 'number' ? index : this.index,
									name: this.name,
									mtllib: this.mtllib,
									smooth: this.smooth,
									groupStart: 0,
									groupEnd: -1,
									groupCount: -1,
									inherited: false
								};
								cloned.clone = this.clone.bind(cloned);
								return cloned;
							}
						};

						this.materials.push(material);

						return material;
					},

					currentMaterial: function currentMaterial() {

						if (this.materials.length > 0) {
							return this.materials[this.materials.length - 1];
						}

						return undefined;
					},

					_finalize: function _finalize(end) {

						var lastMultiMaterial = this.currentMaterial();
						if (lastMultiMaterial && lastMultiMaterial.groupEnd === -1) {

							lastMultiMaterial.groupEnd = this.geometry.vertices.length / 3;
							lastMultiMaterial.groupCount = lastMultiMaterial.groupEnd - lastMultiMaterial.groupStart;
							lastMultiMaterial.inherited = false;
						}

						// Ignore objects tail materials if no face declarations followed them before a new o/g started.
						if (end && this.materials.length > 1) {

							for (var mi = this.materials.length - 1; mi >= 0; mi--) {
								if (this.materials[mi].groupCount <= 0) {
									this.materials.splice(mi, 1);
								}
							}
						}

						// Guarantee at least one empty material, this makes the creation later more straight forward.
						if (end && this.materials.length === 0) {

							this.materials.push({
								name: '',
								smooth: this.smooth
							});
						}

						return lastMultiMaterial;
					}
				};

				// Inherit previous objects material.
				// Spec tells us that a declared material must be set to all objects until a new material is declared.
				// If a usemtl declaration is encountered while this new object is being parsed, it will
				// overwrite the inherited material. Exception being that there was already face declarations
				// to the inherited material, then it will be preserved for proper MultiMaterial continuation.

				if (previousMaterial && previousMaterial.name && typeof previousMaterial.clone === 'function') {

					var declared = previousMaterial.clone(0);
					declared.inherited = true;
					this.object.materials.push(declared);
				}

				this.objects.push(this.object);
			},

			finalize: function finalize() {

				if (this.object && typeof this.object._finalize === 'function') {

					this.object._finalize(true);
				}
			},

			parseVertexIndex: function parseVertexIndex(value, len) {

				var index = parseInt(value, 10);
				return (index >= 0 ? index - 1 : index + len / 3) * 3;
			},

			parseNormalIndex: function parseNormalIndex(value, len) {

				var index = parseInt(value, 10);
				return (index >= 0 ? index - 1 : index + len / 3) * 3;
			},

			parseUVIndex: function parseUVIndex(value, len) {

				var index = parseInt(value, 10);
				return (index >= 0 ? index - 1 : index + len / 2) * 2;
			},

			addVertex: function addVertex(a, b, c) {

				var src = this.vertices;
				var dst = this.object.geometry.vertices;

				dst.push(src[a + 0], src[a + 1], src[a + 2]);
				dst.push(src[b + 0], src[b + 1], src[b + 2]);
				dst.push(src[c + 0], src[c + 1], src[c + 2]);
			},

			addVertexLine: function addVertexLine(a) {

				var src = this.vertices;
				var dst = this.object.geometry.vertices;

				dst.push(src[a + 0], src[a + 1], src[a + 2]);
			},

			addNormal: function addNormal(a, b, c) {

				var src = this.normals;
				var dst = this.object.geometry.normals;

				dst.push(src[a + 0], src[a + 1], src[a + 2]);
				dst.push(src[b + 0], src[b + 1], src[b + 2]);
				dst.push(src[c + 0], src[c + 1], src[c + 2]);
			},

			addUV: function addUV(a, b, c) {

				var src = this.uvs;
				var dst = this.object.geometry.uvs;

				dst.push(src[a + 0], src[a + 1]);
				dst.push(src[b + 0], src[b + 1]);
				dst.push(src[c + 0], src[c + 1]);
			},

			addUVLine: function addUVLine(a) {

				var src = this.uvs;
				var dst = this.object.geometry.uvs;

				dst.push(src[a + 0], src[a + 1]);
			},

			addFace: function addFace(a, b, c, ua, ub, uc, na, nb, nc) {

				var vLen = this.vertices.length;

				var ia = this.parseVertexIndex(a, vLen);
				var ib = this.parseVertexIndex(b, vLen);
				var ic = this.parseVertexIndex(c, vLen);

				this.addVertex(ia, ib, ic);

				if (ua !== undefined) {

					var uvLen = this.uvs.length;

					ia = this.parseUVIndex(ua, uvLen);
					ib = this.parseUVIndex(ub, uvLen);
					ic = this.parseUVIndex(uc, uvLen);

					this.addUV(ia, ib, ic);
				}

				if (na !== undefined) {

					// Normals are many times the same. If so, skip function call and parseInt.
					var nLen = this.normals.length;
					ia = this.parseNormalIndex(na, nLen);

					ib = na === nb ? ia : this.parseNormalIndex(nb, nLen);
					ic = na === nc ? ia : this.parseNormalIndex(nc, nLen);

					this.addNormal(ia, ib, ic);
				}
			},

			addLineGeometry: function addLineGeometry(vertices, uvs) {

				this.object.geometry.type = 'Line';

				var vLen = this.vertices.length;
				var uvLen = this.uvs.length;

				for (var vi = 0, l = vertices.length; vi < l; vi++) {

					this.addVertexLine(this.parseVertexIndex(vertices[vi], vLen));
				}

				for (var uvi = 0, l = uvs.length; uvi < l; uvi++) {

					this.addUVLine(this.parseUVIndex(uvs[uvi], uvLen));
				}
			}

		};

		state.startObject('', false);

		return state;
	}

	//

	function OBJLoader(manager) {

		this.manager = manager !== undefined ? manager : THREE.DefaultLoadingManager;

		this.materials = null;
	};

	OBJLoader.prototype = {

		constructor: OBJLoader,

		load: function load(url, onLoad, onProgress, onError) {

			var scope = this;

			var loader = new THREE.FileLoader(scope.manager);
			loader.setPath(this.path);
			loader.load(url, function (text) {

				onLoad(scope.parse(text));
			}, onProgress, onError);
		},

		setPath: function setPath(value) {

			this.path = value;
		},

		setMaterials: function setMaterials(materials) {

			this.materials = materials;

			return this;
		},

		parse: function parse(text) {

			console.time('OBJLoader');

			var state = new ParserState();

			if (text.indexOf('\r\n') !== -1) {

				// This is faster than String.split with regex that splits on both
				text = text.replace(/\r\n/g, '\n');
			}

			if (text.indexOf('\\\n') !== -1) {

				// join lines separated by a line continuation character (\)
				text = text.replace(/\\\n/g, '');
			}

			var lines = text.split('\n');
			var line = '',
			    lineFirstChar = '';
			var lineLength = 0;
			var result = [];

			// Faster to just trim left side of the line. Use if available.
			var trimLeft = typeof ''.trimLeft === 'function';

			for (var i = 0, l = lines.length; i < l; i++) {

				line = lines[i];

				line = trimLeft ? line.trimLeft() : line.trim();

				lineLength = line.length;

				if (lineLength === 0) continue;

				lineFirstChar = line.charAt(0);

				// @todo invoke passed in handler if any
				if (lineFirstChar === '#') continue;

				if (lineFirstChar === 'v') {

					var data = line.split(/\s+/);

					switch (data[0]) {

						case 'v':
							state.vertices.push(parseFloat(data[1]), parseFloat(data[2]), parseFloat(data[3]));
							break;
						case 'vn':
							state.normals.push(parseFloat(data[1]), parseFloat(data[2]), parseFloat(data[3]));
							break;
						case 'vt':
							state.uvs.push(parseFloat(data[1]), parseFloat(data[2]));
							break;
					}
				} else if (lineFirstChar === 'f') {

					var lineData = line.substr(1).trim();
					var vertexData = lineData.split(/\s+/);
					var faceVertices = [];

					// Parse the face vertex data into an easy to work with format

					for (var j = 0, jl = vertexData.length; j < jl; j++) {

						var vertex = vertexData[j];

						if (vertex.length > 0) {

							var vertexParts = vertex.split('/');
							faceVertices.push(vertexParts);
						}
					}

					// Draw an edge between the first vertex and all subsequent vertices to form an n-gon

					var v1 = faceVertices[0];

					for (var j = 1, jl = faceVertices.length - 1; j < jl; j++) {

						var v2 = faceVertices[j];
						var v3 = faceVertices[j + 1];

						state.addFace(v1[0], v2[0], v3[0], v1[1], v2[1], v3[1], v1[2], v2[2], v3[2]);
					}
				} else if (lineFirstChar === 'l') {

					var lineParts = line.substring(1).trim().split(" ");
					var lineVertices = [],
					    lineUVs = [];

					if (line.indexOf("/") === -1) {

						lineVertices = lineParts;
					} else {

						for (var li = 0, llen = lineParts.length; li < llen; li++) {

							var parts = lineParts[li].split("/");

							if (parts[0] !== "") lineVertices.push(parts[0]);
							if (parts[1] !== "") lineUVs.push(parts[1]);
						}
					}
					state.addLineGeometry(lineVertices, lineUVs);
				} else if ((result = object_pattern.exec(line)) !== null) {

					// o object_name
					// or
					// g group_name

					// WORKAROUND: https://bugs.chromium.org/p/v8/issues/detail?id=2869
					// var name = result[ 0 ].substr( 1 ).trim();
					var name = (" " + result[0].substr(1).trim()).substr(1);

					state.startObject(name);
				} else if (material_use_pattern.test(line)) {

					// material

					state.object.startMaterial(line.substring(7).trim(), state.materialLibraries);
				} else if (material_library_pattern.test(line)) {

					// mtl file

					state.materialLibraries.push(line.substring(7).trim());
				} else if (lineFirstChar === 's') {

					result = line.split(' ');

					// smooth shading

					// @todo Handle files that have varying smooth values for a set of faces inside one geometry,
					// but does not define a usemtl for each face set.
					// This should be detected and a dummy material created (later MultiMaterial and geometry groups).
					// This requires some care to not create extra material on each smooth value for "normal" obj files.
					// where explicit usemtl defines geometry groups.
					// Example asset: examples/models/obj/cerberus/Cerberus.obj

					/*
      * http://paulbourke.net/dataformats/obj/
      * or
      * http://www.cs.utah.edu/~boulos/cs3505/obj_spec.pdf
      *
      * From chapter "Grouping" Syntax explanation "s group_number":
      * "group_number is the smoothing group number. To turn off smoothing groups, use a value of 0 or off.
      * Polygonal elements use group numbers to put elements in different smoothing groups. For free-form
      * surfaces, smoothing groups are either turned on or off; there is no difference between values greater
      * than 0."
      */
					if (result.length > 1) {

						var value = result[1].trim().toLowerCase();
						state.object.smooth = value !== '0' && value !== 'off';
					} else {

						// ZBrush can produce "s" lines #11707
						state.object.smooth = true;
					}
					var material = state.object.currentMaterial();
					if (material) material.smooth = state.object.smooth;
				} else {

					// Handle null terminated files without exception
					if (line === '\0') continue;

					throw new Error("Unexpected line: '" + line + "'");
				}
			}

			state.finalize();

			var container = new THREE.Group();
			container.materialLibraries = [].concat(state.materialLibraries);

			for (var i = 0, l = state.objects.length; i < l; i++) {

				var object = state.objects[i];
				var geometry = object.geometry;
				var materials = object.materials;
				var isLine = geometry.type === 'Line';

				// Skip o/g line declarations that did not follow with any faces
				if (geometry.vertices.length === 0) continue;

				var buffergeometry = new THREE.BufferGeometry();

				buffergeometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(geometry.vertices), 3));

				if (geometry.normals.length > 0) {

					buffergeometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(geometry.normals), 3));
				} else {

					buffergeometry.computeVertexNormals();
				}

				if (geometry.uvs.length > 0) {

					buffergeometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.uvs), 2));
				}

				// Create materials

				var createdMaterials = [];

				for (var mi = 0, miLen = materials.length; mi < miLen; mi++) {

					var sourceMaterial = materials[mi];
					var material = undefined;

					if (this.materials !== null) {

						material = this.materials.create(sourceMaterial.name);

						// mtl etc. loaders probably can't create line materials correctly, copy properties to a line material.
						if (isLine && material && !(material instanceof THREE.LineBasicMaterial)) {

							var materialLine = new THREE.LineBasicMaterial();
							materialLine.copy(material);
							material = materialLine;
						}
					}

					if (!material) {

						material = !isLine ? new THREE.MeshPhongMaterial() : new THREE.LineBasicMaterial();
						material.name = sourceMaterial.name;
					}

					material.flatShading = sourceMaterial.smooth ? false : true;

					createdMaterials.push(material);
				}

				// Create mesh

				var mesh;

				if (createdMaterials.length > 1) {

					for (var mi = 0, miLen = materials.length; mi < miLen; mi++) {

						var sourceMaterial = materials[mi];
						buffergeometry.addGroup(sourceMaterial.groupStart, sourceMaterial.groupCount, mi);
					}

					mesh = !isLine ? new THREE.Mesh(buffergeometry, createdMaterials) : new THREE.LineSegments(buffergeometry, createdMaterials);
				} else {

					mesh = !isLine ? new THREE.Mesh(buffergeometry, createdMaterials[0]) : new THREE.LineSegments(buffergeometry, createdMaterials[0]);
				}

				mesh.name = object.name;

				container.add(mesh);
			}

			console.timeEnd('OBJLoader');

			return container;
		}

	};

	return OBJLoader;
}();
'use strict';

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finger swipe

THREE.OrbitControls = function (object, domElement) {

	this.object = object;

	this.domElement = domElement !== undefined ? domElement : document;

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the object orbits around
	this.target = new THREE.Vector3();

	// How far you can dolly in and out ( PerspectiveCamera only )
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// How far you can zoom in and out ( OrthographicCamera only )
	this.minZoom = 0;
	this.maxZoom = Infinity;

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	// How far you can orbit horizontally, upper and lower limits.
	// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
	this.minAzimuthAngle = -Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians

	// Set to true to enable damping (inertia)
	// If damping is enabled, you must call controls.update() in your animation loop
	this.enableDamping = false;
	this.dampingFactor = 0.25;

	// This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
	// Set to false to disable zooming
	this.enableZoom = true;
	this.zoomSpeed = 1.0;

	// Set to false to disable rotating
	this.enableRotate = true;
	this.rotateSpeed = 1.0;

	// Set to false to disable panning
	this.enablePan = true;
	this.keyPanSpeed = 7.0; // pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	// If auto-rotate is enabled, you must call controls.update() in your animation loop
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	// Set to false to disable use of the keys
	this.enableKeys = true;

	// The four arrow keys
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

	// Mouse buttons
	this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

	// for reset
	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();
	this.zoom0 = this.object.zoom;

	//
	// public methods
	//

	this.getPolarAngle = function () {

		return spherical.phi;
	};

	this.getAzimuthalAngle = function () {

		return spherical.theta;
	};

	this.saveState = function () {

		scope.target0.copy(scope.target);
		scope.position0.copy(scope.object.position);
		scope.zoom0 = scope.object.zoom;
	};

	this.reset = function () {

		scope.target.copy(scope.target0);
		scope.object.position.copy(scope.position0);
		scope.object.zoom = scope.zoom0;

		scope.object.updateProjectionMatrix();
		scope.dispatchEvent(changeEvent);

		scope.update();

		state = STATE.NONE;
	};

	// this method is exposed, but perhaps it would be better if we can make it private...
	this.update = function () {

		var offset = new THREE.Vector3();

		// so camera.up is the orbit axis
		var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
		var quatInverse = quat.clone().inverse();

		var lastPosition = new THREE.Vector3();
		var lastQuaternion = new THREE.Quaternion();

		return function update() {

			var position = scope.object.position;

			offset.copy(position).sub(scope.target);

			// rotate offset to "y-axis-is-up" space
			offset.applyQuaternion(quat);

			// angle from z-axis around y-axis
			spherical.setFromVector3(offset);

			if (scope.autoRotate && state === STATE.NONE) {

				rotateLeft(getAutoRotationAngle());
			}

			spherical.theta += sphericalDelta.theta;
			spherical.phi += sphericalDelta.phi;

			// restrict theta to be between desired limits
			spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta));

			// restrict phi to be between desired limits
			spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));

			spherical.makeSafe();

			spherical.radius *= scale;

			// restrict radius to be between desired limits
			spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

			// move target to panned location
			scope.target.add(panOffset);

			offset.setFromSpherical(spherical);

			// rotate offset back to "camera-up-vector-is-up" space
			offset.applyQuaternion(quatInverse);

			position.copy(scope.target).add(offset);

			scope.object.lookAt(scope.target);

			if (scope.enableDamping === true) {

				sphericalDelta.theta *= 1 - scope.dampingFactor;
				sphericalDelta.phi *= 1 - scope.dampingFactor;
			} else {

				sphericalDelta.set(0, 0, 0);
			}

			scale = 1;
			panOffset.set(0, 0, 0);

			// update condition is:
			// min(camera displacement, camera rotation in radians)^2 > EPS
			// using small-angle approximation cos(x/2) = 1 - x^2 / 8

			if (zoomChanged || lastPosition.distanceToSquared(scope.object.position) > EPS || 8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {

				scope.dispatchEvent(changeEvent);

				lastPosition.copy(scope.object.position);
				lastQuaternion.copy(scope.object.quaternion);
				zoomChanged = false;

				return true;
			}

			return false;
		};
	}();

	this.dispose = function () {

		scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
		scope.domElement.removeEventListener('mousedown', onMouseDown, false);
		scope.domElement.removeEventListener('wheel', onMouseWheel, false);

		scope.domElement.removeEventListener('touchstart', onTouchStart, false);
		scope.domElement.removeEventListener('touchend', onTouchEnd, false);
		scope.domElement.removeEventListener('touchmove', onTouchMove, false);

		document.removeEventListener('mousemove', onMouseMove, false);
		document.removeEventListener('mouseup', onMouseUp, false);

		window.removeEventListener('keydown', onKeyDown, false);

		//scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?
	};

	//
	// internals
	//

	var scope = this;

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };

	var STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY: 4, TOUCH_PAN: 5 };

	var state = STATE.NONE;

	var EPS = 0.000001;

	// current position in spherical coordinates
	var spherical = new THREE.Spherical();
	var sphericalDelta = new THREE.Spherical();

	var scale = 1;
	var panOffset = new THREE.Vector3();
	var zoomChanged = false;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
	}

	function getZoomScale() {

		return Math.pow(0.95, scope.zoomSpeed);
	}

	function rotateLeft(angle) {

		sphericalDelta.theta -= angle;
	}

	function rotateUp(angle) {

		sphericalDelta.phi -= angle;
	}

	var panLeft = function () {

		var v = new THREE.Vector3();

		return function panLeft(distance, objectMatrix) {

			v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
			v.multiplyScalar(-distance);

			panOffset.add(v);
		};
	}();

	var panUp = function () {

		var v = new THREE.Vector3();

		return function panUp(distance, objectMatrix) {

			v.setFromMatrixColumn(objectMatrix, 1); // get Y column of objectMatrix
			v.multiplyScalar(distance);

			panOffset.add(v);
		};
	}();

	// deltaX and deltaY are in pixels; right and down are positive
	var pan = function () {

		var offset = new THREE.Vector3();

		return function pan(deltaX, deltaY) {

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			if (scope.object instanceof THREE.PerspectiveCamera) {

				// perspective
				var position = scope.object.position;
				offset.copy(position).sub(scope.target);
				var targetDistance = offset.length();

				// half of the fov is center to top of screen
				targetDistance *= Math.tan(scope.object.fov / 2 * Math.PI / 180.0);

				// we actually don't use screenWidth, since perspective camera is fixed to screen height
				panLeft(2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix);
				panUp(2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix);
			} else if (scope.object instanceof THREE.OrthographicCamera) {

				// orthographic
				panLeft(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth, scope.object.matrix);
				panUp(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight, scope.object.matrix);
			} else {

				// camera neither orthographic nor perspective
				console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
				scope.enablePan = false;
			}
		};
	}();

	function dollyIn(dollyScale) {

		if (scope.object instanceof THREE.PerspectiveCamera) {

			scale /= dollyScale;
		} else if (scope.object instanceof THREE.OrthographicCamera) {

			scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
			scope.object.updateProjectionMatrix();
			zoomChanged = true;
		} else {

			console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
			scope.enableZoom = false;
		}
	}

	function dollyOut(dollyScale) {

		if (scope.object instanceof THREE.PerspectiveCamera) {

			scale *= dollyScale;
		} else if (scope.object instanceof THREE.OrthographicCamera) {

			scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
			scope.object.updateProjectionMatrix();
			zoomChanged = true;
		} else {

			console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
			scope.enableZoom = false;
		}
	}

	//
	// event callbacks - update the object state
	//

	function handleMouseDownRotate(event) {

		//console.log( 'handleMouseDownRotate' );

		rotateStart.set(event.clientX, event.clientY);
	}

	function handleMouseDownDolly(event) {

		//console.log( 'handleMouseDownDolly' );

		dollyStart.set(event.clientX, event.clientY);
	}

	function handleMouseDownPan(event) {

		//console.log( 'handleMouseDownPan' );

		panStart.set(event.clientX, event.clientY);
	}

	function handleMouseMoveRotate(event) {

		//console.log( 'handleMouseMoveRotate' );

		rotateEnd.set(event.clientX, event.clientY);
		rotateDelta.subVectors(rotateEnd, rotateStart);

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		// rotating across whole screen goes 360 degrees around
		rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);

		// rotating up and down along whole screen attempts to go 360, but limited to 180
		rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);

		rotateStart.copy(rotateEnd);

		scope.update();
	}

	function handleMouseMoveDolly(event) {

		//console.log( 'handleMouseMoveDolly' );

		dollyEnd.set(event.clientX, event.clientY);

		dollyDelta.subVectors(dollyEnd, dollyStart);

		if (dollyDelta.y > 0) {

			dollyIn(getZoomScale());
		} else if (dollyDelta.y < 0) {

			dollyOut(getZoomScale());
		}

		dollyStart.copy(dollyEnd);

		scope.update();
	}

	function handleMouseMovePan(event) {

		//console.log( 'handleMouseMovePan' );

		panEnd.set(event.clientX, event.clientY);

		panDelta.subVectors(panEnd, panStart);

		pan(panDelta.x, panDelta.y);

		panStart.copy(panEnd);

		scope.update();
	}

	function handleMouseUp(event) {

		// console.log( 'handleMouseUp' );

	}

	function handleMouseWheel(event) {

		// console.log( 'handleMouseWheel' );

		if (event.deltaY < 0) {

			dollyOut(getZoomScale());
		} else if (event.deltaY > 0) {

			dollyIn(getZoomScale());
		}

		scope.update();
	}

	function handleKeyDown(event) {

		//console.log( 'handleKeyDown' );

		switch (event.keyCode) {

			case scope.keys.UP:
				pan(0, scope.keyPanSpeed);
				scope.update();
				break;

			case scope.keys.BOTTOM:
				pan(0, -scope.keyPanSpeed);
				scope.update();
				break;

			case scope.keys.LEFT:
				pan(scope.keyPanSpeed, 0);
				scope.update();
				break;

			case scope.keys.RIGHT:
				pan(-scope.keyPanSpeed, 0);
				scope.update();
				break;

		}
	}

	function handleTouchStartRotate(event) {

		//console.log( 'handleTouchStartRotate' );

		rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
	}

	function handleTouchStartDolly(event) {

		//console.log( 'handleTouchStartDolly' );

		var dx = event.touches[0].pageX - event.touches[1].pageX;
		var dy = event.touches[0].pageY - event.touches[1].pageY;

		var distance = Math.sqrt(dx * dx + dy * dy);

		dollyStart.set(0, distance);
	}

	function handleTouchStartPan(event) {

		//console.log( 'handleTouchStartPan' );

		panStart.set(event.touches[0].pageX, event.touches[0].pageY);
	}

	function handleTouchMoveRotate(event) {

		//console.log( 'handleTouchMoveRotate' );

		rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
		rotateDelta.subVectors(rotateEnd, rotateStart);

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		// rotating across whole screen goes 360 degrees around
		rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);

		// rotating up and down along whole screen attempts to go 360, but limited to 180
		rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);

		rotateStart.copy(rotateEnd);

		scope.update();
	}

	function handleTouchMoveDolly(event) {

		//console.log( 'handleTouchMoveDolly' );

		var dx = event.touches[0].pageX - event.touches[1].pageX;
		var dy = event.touches[0].pageY - event.touches[1].pageY;

		var distance = Math.sqrt(dx * dx + dy * dy);

		dollyEnd.set(0, distance);

		dollyDelta.subVectors(dollyEnd, dollyStart);

		if (dollyDelta.y > 0) {

			dollyOut(getZoomScale());
		} else if (dollyDelta.y < 0) {

			dollyIn(getZoomScale());
		}

		dollyStart.copy(dollyEnd);

		scope.update();
	}

	function handleTouchMovePan(event) {

		//console.log( 'handleTouchMovePan' );

		panEnd.set(event.touches[0].pageX, event.touches[0].pageY);

		panDelta.subVectors(panEnd, panStart);

		pan(panDelta.x, panDelta.y);

		panStart.copy(panEnd);

		scope.update();
	}

	function handleTouchEnd(event) {}

	//console.log( 'handleTouchEnd' );

	//
	// event handlers - FSM: listen for events and reset state
	//

	function onMouseDown(event) {

		if (scope.enabled === false) return;

		event.preventDefault();

		switch (event.button) {

			case scope.mouseButtons.ORBIT:

				if (scope.enableRotate === false) return;

				handleMouseDownRotate(event);

				state = STATE.ROTATE;

				break;

			case scope.mouseButtons.ZOOM:

				if (scope.enableZoom === false) return;

				handleMouseDownDolly(event);

				state = STATE.DOLLY;

				break;

			case scope.mouseButtons.PAN:

				if (scope.enablePan === false) return;

				handleMouseDownPan(event);

				state = STATE.PAN;

				break;

		}

		if (state !== STATE.NONE) {

			document.addEventListener('mousemove', onMouseMove, false);
			document.addEventListener('mouseup', onMouseUp, false);

			scope.dispatchEvent(startEvent);
		}
	}

	function onMouseMove(event) {

		if (scope.enabled === false) return;

		event.preventDefault();

		switch (state) {

			case STATE.ROTATE:

				if (scope.enableRotate === false) return;

				handleMouseMoveRotate(event);

				break;

			case STATE.DOLLY:

				if (scope.enableZoom === false) return;

				handleMouseMoveDolly(event);

				break;

			case STATE.PAN:

				if (scope.enablePan === false) return;

				handleMouseMovePan(event);

				break;

		}
	}

	function onMouseUp(event) {

		if (scope.enabled === false) return;

		handleMouseUp(event);

		document.removeEventListener('mousemove', onMouseMove, false);
		document.removeEventListener('mouseup', onMouseUp, false);

		scope.dispatchEvent(endEvent);

		state = STATE.NONE;
	}

	function onMouseWheel(event) {

		if (scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE && state !== STATE.ROTATE) return;

		event.preventDefault();
		event.stopPropagation();

		handleMouseWheel(event);

		scope.dispatchEvent(startEvent); // not sure why these are here...
		scope.dispatchEvent(endEvent);
	}

	function onKeyDown(event) {

		if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) return;

		handleKeyDown(event);
	}

	function onTouchStart(event) {

		if (scope.enabled === false) return;

		switch (event.touches.length) {

			case 1:
				// one-fingered touch: rotate

				if (scope.enableRotate === false) return;

				handleTouchStartRotate(event);

				state = STATE.TOUCH_ROTATE;

				break;

			case 2:
				// two-fingered touch: dolly

				if (scope.enableZoom === false) return;

				handleTouchStartDolly(event);

				state = STATE.TOUCH_DOLLY;

				break;

			case 3:
				// three-fingered touch: pan

				if (scope.enablePan === false) return;

				handleTouchStartPan(event);

				state = STATE.TOUCH_PAN;

				break;

			default:

				state = STATE.NONE;

		}

		if (state !== STATE.NONE) {

			scope.dispatchEvent(startEvent);
		}
	}

	function onTouchMove(event) {

		if (scope.enabled === false) return;

		event.preventDefault();
		event.stopPropagation();

		switch (event.touches.length) {

			case 1:
				// one-fingered touch: rotate

				if (scope.enableRotate === false) return;
				if (state !== STATE.TOUCH_ROTATE) return; // is this needed?...

				handleTouchMoveRotate(event);

				break;

			case 2:
				// two-fingered touch: dolly

				if (scope.enableZoom === false) return;
				if (state !== STATE.TOUCH_DOLLY) return; // is this needed?...

				handleTouchMoveDolly(event);

				break;

			case 3:
				// three-fingered touch: pan

				if (scope.enablePan === false) return;
				if (state !== STATE.TOUCH_PAN) return; // is this needed?...

				handleTouchMovePan(event);

				break;

			default:

				state = STATE.NONE;

		}
	}

	function onTouchEnd(event) {

		if (scope.enabled === false) return;

		handleTouchEnd(event);

		scope.dispatchEvent(endEvent);

		state = STATE.NONE;
	}

	function onContextMenu(event) {

		if (scope.enabled === false) return;

		event.preventDefault();
	}

	//

	scope.domElement.addEventListener('contextmenu', onContextMenu, false);

	scope.domElement.addEventListener('mousedown', onMouseDown, false);
	scope.domElement.addEventListener('wheel', onMouseWheel, false);

	scope.domElement.addEventListener('touchstart', onTouchStart, false);
	scope.domElement.addEventListener('touchend', onTouchEnd, false);
	scope.domElement.addEventListener('touchmove', onTouchMove, false);

	window.addEventListener('keydown', onKeyDown, false);

	// force an update at start

	this.update();
};

THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;

Object.defineProperties(THREE.OrbitControls.prototype, {

	center: {

		get: function get() {

			console.warn('THREE.OrbitControls: .center has been renamed to .target');
			return this.target;
		}

	},

	// backward compatibility

	noZoom: {

		get: function get() {

			console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
			return !this.enableZoom;
		},

		set: function set(value) {

			console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
			this.enableZoom = !value;
		}

	},

	noRotate: {

		get: function get() {

			console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
			return !this.enableRotate;
		},

		set: function set(value) {

			console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
			this.enableRotate = !value;
		}

	},

	noPan: {

		get: function get() {

			console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
			return !this.enablePan;
		},

		set: function set(value) {

			console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
			this.enablePan = !value;
		}

	},

	noKeys: {

		get: function get() {

			console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
			return !this.enableKeys;
		},

		set: function set(value) {

			console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
			this.enableKeys = !value;
		}

	},

	staticMoving: {

		get: function get() {

			console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
			return !this.enableDamping;
		},

		set: function set(value) {

			console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
			this.enableDamping = !value;
		}

	},

	dynamicDampingFactor: {

		get: function get() {

			console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
			return this.dampingFactor;
		},

		set: function set(value) {

			console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
			this.dampingFactor = value;
		}

	}

});
'use strict';

(function () {
    var width = window.innerWidth;
    var height = window.innerHeight;

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    document.body.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    console.log(scene);
    var cubeGeometry = new THREE.CubeGeometry(20, 20, 20, 5, 5, 5);
    var cubeMaterial;
    var cube;
    var floor;
    var cubes = [];
    function randomColorMesh() {
        return new THREE.Color(parseInt('0x' + Math.floor(Math.random() * 16777215).toString(16), 16));
    }

    var cubicalLoader = new THREE.OBJLoader();
    var theCubical;
    // load a resource
    cubicalLoader.load('../STUCT_LOW-RES-resized.obj', function (object) {
        theCubical = object;
        theCubical.position.y = 2;
        theCubical.rotation.z = 2;
        console.log('theCubical: ', theCubical);
        theCubical.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                console.log('child: ', child);
                child.material.wireframe = true;
                child.geometry.buffersNeedUpdate;
                child.geometry.uvsNeedUpdate;
            }
        });
        scene.add(theCubical);
        document.addEventListener('mousemove', onDocumentMouseMove, false);
        render();
    });

    // FLOOR
    var loader = new THREE.TextureLoader();
    loader.load('../imgs/MATRIX_CORE_DISPLACEMENT_8K.png', function (texture) {

        var floorMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.1
        });
        var floorGeometry = new THREE.PlaneGeometry(100, 100, 10, 10);
        floor = new THREE.Mesh(floorGeometry, floorMaterial);
        //floor.position.y = -20;
        floor.rotation.x = Math.PI / 2;
        floor.position.y = -10;
        scene.add(floor);
    });

    var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);

    //camera.position.y = 30;
    //camera.position.z = 30;

    camera.position.x = 32;
    camera.position.y = -11;
    camera.position.z = 65;

    scene.add(camera);

    renderer.render(scene, camera);

    var mouse = new THREE.Vector3(0, 0, 1);
    function onDocumentMouseMove(event) {
        mouse.x = event.clientX - window.innerWidth / 2;
        mouse.y = event.clientY - window.innerHeight / 2;
    }

    var skyboxGeometry = new THREE.CubeGeometry(10000, 10000, 10000);
    var skyboxMaterial = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide });
    var skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);

    scene.add(skybox);

    var pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(0, 300, 200);

    scene.add(pointLight);

    renderer.render(scene, camera);

    function render() {
        var rotSpeed = 0.01;
        //theCubical.rotation.y = ( ( mouse.x - theCubical.rotation.y ) * .00008);
        //theCubical.rotation.x =  mouse.x * Math.cos(rotSpeed) * Math.sin(rotSpeed);
        //floor.rotation.y =  ( ( - mouse.y  - floor.rotation.y ) * .0008);
        //theCubical.rotation.z =  ( ( - mouse.y  - theCubical.rotation.z ) * .00008);

        camera.position.x = mouse.x * Math.cos(rotSpeed) * Math.sin(rotSpeed);
        camera.position.y = mouse.y * Math.cos(rotSpeed) * Math.sin(rotSpeed);
        //camera.position.z = z * Math.cos(rotSpeed) - x * Math.sin(rotSpeed);
        //camera.position.y = -( ( mouse.y - camera.position.y ) * .008);
        //camera.position.x = - ( ( - mouse.x  - camera.position.x ) * .005);
        camera.lookAt(scene.position);
        renderer.render(scene, camera);

        requestAnimationFrame(render);
        console.log(camera);
    }

    //controls = new THREE.OrbitControls( camera, renderer.domElement );

})();