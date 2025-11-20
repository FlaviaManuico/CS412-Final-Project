
function mat4Identity() {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

function perspective(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0
    ]);
}

function lookAt(eye, center, up) {
    let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
    
    const eyex = eye[0], eyey = eye[1], eyez = eye[2];
    const upx = up[0], upy = up[1], upz = up[2];
    const centerx = center[0], centery = center[1], centerz = center[2];

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;
    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len; z1 *= len; z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0; x1 = 0; x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len; x1 *= len; x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;
    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0; y1 = 0; y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len; y1 *= len; y2 *= len;
    }

    return new Float32Array([
        x0, y0, z0, 0,
        x1, y1, z1, 0,
        x2, y2, z2, 0,
        -(x0 * eyex + x1 * eyey + x2 * eyez),
        -(y0 * eyex + y1 * eyey + y2 * eyez),
        -(z0 * eyex + z1 * eyey + z2 * eyez),
        1
    ]);
}

function mat4Translate(matrix, translation) {
    const result = new Float32Array(matrix);
    const x = translation[0], y = translation[1], z = translation[2];
    
    result[12] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    result[13] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    result[14] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    result[15] = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
    
    return result;
}

function mat4Scale(matrix, scale) {
    const result = new Float32Array(matrix);
    const x = scale[0], y = scale[1], z = scale[2];
    
    result[0] *= x;  result[1] *= x;  result[2] *= x;  result[3] *= x;
    result[4] *= y;  result[5] *= y;  result[6] *= y;  result[7] *= y;
    result[8] *= z;  result[9] *= z;  result[10] *= z; result[11] *= z;
    
    return result;
}

function mat4RotateX(matrix, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const result = new Float32Array(matrix);

    const mv1 = matrix[4], mv5 = matrix[5], mv9 = matrix[6], mv13 = matrix[7];
    const mv2 = matrix[8], mv6 = matrix[9], mv10 = matrix[10], mv14 = matrix[11];

    result[4] = mv1 * c + mv2 * s;
    result[5] = mv5 * c + mv6 * s;
    result[6] = mv9 * c + mv10 * s;
    result[7] = mv13 * c + mv14 * s;
    result[8] = mv2 * c - mv1 * s;
    result[9] = mv6 * c - mv5 * s;
    result[10] = mv10 * c - mv9 * s;
    result[11] = mv14 * c - mv13 * s;

    return result;
}

function mat4RotateY(matrix, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const result = new Float32Array(matrix);

    const mv0 = matrix[0], mv4 = matrix[1], mv8 = matrix[2], mv12 = matrix[3];
    const mv2 = matrix[8], mv6 = matrix[9], mv10 = matrix[10], mv14 = matrix[11];

    result[0] = mv0 * c - mv2 * s;
    result[1] = mv4 * c - mv6 * s;
    result[2] = mv8 * c - mv10 * s;
    result[3] = mv12 * c - mv14 * s;
    result[8] = mv0 * s + mv2 * c;
    result[9] = mv4 * s + mv6 * c;
    result[10] = mv8 * s + mv10 * c;
    result[11] = mv12 * s + mv14 * c;

    return result;
}

function mat4RotateZ(matrix, angle) {
    const s = Math.sin(angle), c = Math.cos(angle);
    const a00 = matrix[0], a01 = matrix[1], a02 = matrix[2], a03 = matrix[3];
    const a10 = matrix[4], a11 = matrix[5], a12 = matrix[6], a13 = matrix[7];
    const result = new Float32Array(matrix);
    
    result[0] = a00 * c + a10 * s;
    result[1] = a01 * c + a11 * s;
    result[2] = a02 * c + a12 * s;
    result[3] = a03 * c + a13 * s;
    result[4] = a10 * c - a00 * s;
    result[5] = a11 * c - a01 * s;
    result[6] = a12 * c - a02 * s;
    result[7] = a13 * c - a03 * s;
    
    return result;
}

function multiplyMat4(a, b) {
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            result[i * 4 + j] = 0;
            for (let k = 0; k < 4; k++) {
                result[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
            }
        }
    }
    return result;
}

//matrix invert
function mat4Invert(a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1.0 / det;

    const out = new Float32Array(16);
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
}

// matrix transpose
function mat4Transpose(a) {
    const out = new Float32Array(16);
    out[0] = a[0];  out[1] = a[4];  out[2] = a[8];   out[3] = a[12];
    out[4] = a[1];  out[5] = a[5];  out[6] = a[9];   out[7] = a[13];
    out[8] = a[2];  out[9] = a[6];  out[10] = a[10]; out[11] = a[14];
    out[12] = a[3]; out[13] = a[7]; out[14] = a[11]; out[15] = a[15];
    return out;
}
