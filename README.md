gltf-js-utils
=============

Helper library for creating glTF 2.0 models with JavaScript.

Includes a basic Three.js to glTF converter.

## Usage
See `src/demo.ts` for usage and test cases

#### Creating glTF from scratch

Create a `GLTFAsset` structure using the provided types.

```javascript
import {
  GLTFAsset, Scene, Node, Material, Texture, Mesh, Vertex, WrappingMode
} from "gltf-js-utils";

const asset = new GLTFAsset();
const scene = new Scene();
asset.addScene(scene);

const node = new Node();
node.setTranslation(x, y, z);
node.setRotationRadians(x, y, z);
node.setScale(x, y, z);
scene.addNode(node);

const material = new Material();
const texture = new Texture(image); // HTMLImageElement
texture.wrapS = WrappingMode.CLAMP_TO_EDGE;
texture.wrapT = WrappingMode.REPEAT;
material.pbrMetallicRoughness.baseColorTexture = texture;

const mesh = new Mesh();
mesh.material = [material];

const v1 = new Vertex();
v1.x = 1;
v1.y = 1;
v1.z = 1;
v1.u = 0;
v1.v = 0;
const v2 = new Vertex();
// ...

mesh.addFace(v1, v2, v3, faceMaterialIndex /* 0 */);
mesh.addFace(v4, v5, v6, faceMaterialIndex);
// ...
```

###### Create Animation 

```javascript
import { Node, Animation, InterpolationMode, Transformation } from "gltf-js-utils";

const node = new Node();
scene.addNode(node);
const nodeAnim = new Animation("translation");
let keyframes = [
    {
        time: 0,
        value: [1, 2, 3],
        interpType: InterpolationMode.CUBICSPLINE,
        rightTangent: [0.1,0.2,0.3], // xyz
        leftTangent: [1,2,3], // xyz (similar to FBX, leftTangent means leftTangent for NEXT FRAME)
        leftTangentWeight: [0.2,0.4,0.6], // xyz
    },
    {
        time: 0.3,
        value: [4, 5, 6],
        interpType: InterpolationMode.LINEAR
    }
];
nodeAnim.addKeyframes(keyframes);
nodeAnim.addKeyframe(0.8, [7, 8, 9], InterpolationMode.STEP, {rightTangent:[0,0,0]});
node.animations = [nodeAnim];

/*
NOTE ON SINGLE CHANNEL ANIMATION:

GLTF does not support single channel animation out-the-box. 
As a workaround, simply add ".x", ".y", or ".z" to the path.
And use scalar values per keyframe.

The output sampler will be a SCALAR accessor
*/

const nodeAnim = new Animation("rotation.x"); // for x channel 
let keyframes = [
    {
        time: 0,
        value: 2, // scalar, or [2] also works
        interpType: InterpolationMode.CUBICSPLINE,
        rightTangent: 0.1, // scalar
        leftTangentWeight: 0.22, // scalar
    }
];
nodeAnim.addKeyframes(keyframes);


/*
NOTE ON CUBICSPLINE TANGENT DATA:
A separate VEC4 accessor will be created for the tangent data.
This is stored in the *extras.tangents* field in the respective animation *sampler* 
{
    input: 2,
    output: 3,
    interpolation: "CUBICSPLINE",
    extras: {tangents: 4} // points to the VEC4 accessor storing tangent data
}

Each VEC4 stores (rightTangent, rightTangentWeight, leftTangent, leftTangentWeight) per keyframe per channel 
Similar to FBX, rightTangent means outTangent for current keyframe, leftTangent means inTangent for next keyframe

Example: For a VEC3 datatype, the order is [VEC3.X Tangent, VEC3.Y Tangent, VEC3.Z Tangent], where Tangent is 
(rightTangent, rightTangentWeight, leftTangent, leftTangentWeight)
- rightTangent, leftTangent default at 0
- rightTangentWeight, leftTangentWeight default at 1 / 3
*/
```

##### Export to a collection of individual files/data

With the default options, you'll receive an object keyed with the glTF JSON and binary buffers.

```javascript
import { exportGLTF } from "gltf-js-utils";

const gltfFiles = await exportGLTF(asset);
// {
//   "model.gltf": string /* JSON glTF string */
//   "data1.bin": ArrayBuffer /* ArrayBuffer of buffer data */
//   "data2.bin": ArrayBuffer,
//   "data3.bin": ArrayBuffer,
//   ...
//   "img1.png": ArrayBuffer /* Texture image */
//   "img2.png": ArrayBuffer
//   ...
// }
```

##### Export using data URIs

Buffers and/or images can be embedded within the JSON as data URIs.

```javascript
import { exportGLTF, BufferOutputType } from "gltf-js-utils";

const gltfFiles = await exportGLTF(asset, {
  bufferOutputType: BufferOutputType.DataURI,
  imageOutputType: BufferOutputType.DataURI,
});
// {
//   "model.gltf": string /* JSON glTF string, all data embedded */
// }
```

##### Export to a ZIP file

Requires a `JSZip` reference. The result will be a ZIP blob.

```javascript
import * as JSZip from "jszip";
import { exportGLTFZip } from "gltf-js-utils";

exportGLTFZip(asset, JSZip).then(blob => {
  // Use FileSaver as an example.
  saveAs(blob, "model.zip");
});
```

#### Create glTF from Three.js object

```javascript
import { exportGLTF, glTFAssetFromTHREE } from "gltf-js-utils";

// Create a Three.js Scene or Object3D structure...
const scene = new THREE.Scene();
...

const gltfFiles = await exportGLTF(glTFAssetFromTHREE(scene));
```

#### Create a GLB container

Calling `exportGLB` will produce a single GLB model in an ArrayBuffer.

```javascript
import { exportGLB } from "gltf-js-utils";

const glbArrayBuffer = await exportGLB(asset);
```

You can also use `exportGLTF` with the GLB output type to selectively keep some assets external.

```javascript
import { exportGLTF, BufferOutputType } from "gltf-js-utils";

const gltfFiles = await exportGLTF(asset, {
  bufferOutputType: BufferOutputType.GLB,
  imageOutputType: BufferOutputType.External,
});
// {
//   "model.glb": ArrayBuffer
//   ...
//   // Only images follow, data bins are in the GLB file
//   "img1.png": ArrayBuffer /* Texture image */
//   "img2.png": ArrayBuffer
// }
```

## Limitations
* No support for camera yet (will add soon). Works with skins and animations in latest update.
* Three.js export is limited to basic functionality (`MeshBasicMaterial`)

## Development

To build:

    npm install
    npm run build

## License

MIT
