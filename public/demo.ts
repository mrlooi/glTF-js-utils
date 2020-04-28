import * as GLTFUtils from "../src/index";
import { ComponentType, DataType } from "../src/index";
import { glTF, glTFAnimation, glTFAnimationChannel, glTFAnimationSampler } from "../src/gltftypes";
import { Animation } from "../src/animation";
import { InterpolationMode, Transformation } from "../src/types";
import { addAccessor, addBuffer, addScenes, createEmptyGLTF } from "../src/gltf";


function assert_scalar_equal(s:number, s1:number, eps:number=1e-4) {
    console.assert(Math.abs(s - s1) < eps);
}

function assert_scalar_array_equal(arr1:number[], arr2:number[], eps:number=1e-4) {
    const N = arr1.length;
    console.assert(N === arr2.length);
    for(let i = 0; i < N; ++i) {
        assert_scalar_equal(arr1[i], arr2[i], eps);
    }
}

function download(content: string, fileName: string, contentType: string = "text/plain") {
    const a = document.createElement("a");
    const file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}


function flatten(arr: any[]): any[] {
    return arr.reduce(function (flat, toFlatten) {
        return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
    }, []);
}

function createGLTF(asset: GLTFUtils.GLTFAsset): glTF {
    return createEmptyGLTF();
}


function test1() {
    const asset = new GLTFUtils.GLTFAsset();
    const scene = new GLTFUtils.Scene();

    const gltf = createGLTF(asset);

    asset.addScene(scene);

    let x = 1;
    let y = 2;
    let z = 3;

    const node = new GLTFUtils.Node();
    node.setTranslation(x, y, z);
    node.setRotationRadians(x, y, z);
    node.setScale(x, y, z);
    scene.addNode(node);

    addScenes(gltf, asset);

    console.assert(gltf.scenes!.length === 1 && gltf.nodes!.length === 1 && gltf.scenes![0].nodes![0] === 0)

    let buffer = addBuffer(gltf); // for translation
    let bufferView = buffer.addBufferView(ComponentType.FLOAT, DataType.VEC3); // add translation
    let bufferView2 = buffer.addBufferView(ComponentType.FLOAT, DataType.VEC4); // add quat
    let bufferView3 = buffer.addBufferView(ComponentType.FLOAT, DataType.SCALAR);
    console.assert(bufferView.getIndex() === 0 && bufferView2.getIndex() === 1);

    function createAccessor(bufferView: GLTFUtils.BufferView, num: number = 1) {
        bufferView.startAccessor();

        num = Math.max(0, num);
        for (let i = 0; i < num; ++i) {
            bufferView.push(i*3);
            bufferView.push(i*3+1);
            bufferView.push(i*3+2);
        }

        let accessor = bufferView.endAccessor();
        addAccessor(gltf, bufferView.getIndex(), accessor);
    }

    createAccessor(bufferView, 1);
    let acc1 = gltf.accessors![0];
    console.assert(acc1.count === 1 && acc1.max![0] === 0 && acc1.min![0] === 0 && acc1.min![1] === 1);

    createAccessor(bufferView, 2);
    acc1 = gltf.accessors![1];
    console.assert(acc1.count === 2 && acc1.byteOffset === 3 * 4 && acc1.max![0] === 3 && acc1.min![0] === 0);

    function createAnimation() {
        let animation_sample = [
            {
                "samplers" : [
                    {
                        "input" : 2,
                        "interpolation" : "LINEAR",
                        "output" : 3
                    }
                ],
                "channels" : [ {
                    "sampler" : 0,
                    "target" : {
                        "node" : 0,
                        "path" : "rotation"
                    }
                } ]
            }
        ]

        let node_idx = 0;

        let myAnimation: glTFAnimation = {
            channels: [],
            samplers: []
        }

        let times = [0, 0.2, 0.4, 0.6, 0.8];
        let values = [];

        let num = times.length;
        let interpType = InterpolationMode.LINEAR; // samplers
        for (let i = 0; i < num; ++i)
        {
            values.push([i*4, i*4+1, i*4+2, i*4+3]);
        }

        // create times accessor and values accessor first
        bufferView3.startAccessor();
        for (let t of times)
            bufferView3.push(t);
        let accessor = bufferView3.endAccessor();
        let accessor_idx = addAccessor(gltf, bufferView3.getIndex(), accessor);

        let flat = flatten(values);
        bufferView2.startAccessor();
        for (let v of flat)
            bufferView2.push(v);
        let accessor2 = bufferView2.endAccessor();
        let accessor2_idx = addAccessor(gltf, bufferView2.getIndex(), accessor2);

        // then create samplers (input: times accessor idx, output: values accessor idx)
        let sampler: glTFAnimationSampler = {
            "input": accessor_idx,
            "output": accessor2_idx,
            "interpolation": interpType
        };
        myAnimation.samplers.push(sampler);
        let sampler_idx = myAnimation.samplers.length;
        // then create channels (sampler: get sampler idx from above)
        let channel: glTFAnimationChannel = {
            "sampler": sampler_idx,
            "target": {
                "node": node_idx,
                "path": Transformation.ROTATION
            }
        };
        myAnimation.channels.push(channel);

        if (!gltf.animations)
            gltf.animations = [];
        gltf.animations.push(myAnimation)
    }

    createAnimation();

    let promises = [];
    bufferView.finalize();
    bufferView2.finalize();
    bufferView3.finalize();
    promises.push(buffer.finalize());

    let bufv1 = gltf.bufferViews![0];
    let buf1 = gltf.buffers![0];

    Promise.all(promises).then(() => {
        console.assert(bufv1.byteLength === 3 * 3 * 4)
        // console.assert(buf1.byteLength === 3 * 3 * 4);
        console.log(gltf)
        console.log(gltf.animations)
        console.log(buf1.uri)
    });
    // console.log(gltf.scenes);
    // console.log(gltf.accessors);
}

function animation_test() {
    const asset = new GLTFUtils.GLTFAsset();
    const scene = new GLTFUtils.Scene();

    asset.addScene(scene);

    const gltf = createGLTF(asset);

    let x = 1;
    let y = 2;
    let z = 3;

    const node = new GLTFUtils.Node();
    node.setTranslation(x, y, z);
    node.setRotationRadians(x, y, z);
    node.setScale(x, y, z);
    scene.addNode(node);

    let nodeAnim1 = new GLTFUtils.Animation(Transformation.ROTATION);
    let keyframes = [
        {
            time: 0,
            value: [1,2,3,4],
            interpType: InterpolationMode.LINEAR
        },
        {
            time: 0.2,
            value: [2,3,4,5],
            interpType: InterpolationMode.LINEAR,
            include: [0, 2]
        },
        {
            time: 0.4,
            value: [2,3,4,5],
            interpType: InterpolationMode.LINEAR
        },
        {
            time: 0.6,
            value: [1,2,3,4],
            interpType: InterpolationMode.STEP
        }
    ];
    nodeAnim1.addKeyframes(keyframes);
    nodeAnim1.addKeyframe(0.8, [1,2,3,4], InterpolationMode.STEP);

    console.log(nodeAnim1)

    let nodeAnim2 = new GLTFUtils.Animation(Transformation.TRANSLATION);
    keyframes = [
        {
            time: 0,
            value: [1,2,3],
            interpType: InterpolationMode.LINEAR
        },
        {
            time: 0.3,
            value: [4,5,6],
            interpType: InterpolationMode.LINEAR
        }
    ];
    nodeAnim2.addKeyframes(keyframes);
    node.animations = [nodeAnim1, nodeAnim2];

    addScenes(gltf, asset);

    // console.log(gltf.animations)
    // console.log(gltf.accessors);
    //
    const gltfAnim = gltf.animations![0];
    console.assert(gltfAnim.samplers!.length === 3);
    console.assert(gltfAnim.channels!.length === 3);
    let channel1 = gltfAnim.channels![0]; // path: ROTATION
    let channel2 = gltfAnim.channels![1]; // path: ROTATION
    let channel3 = gltfAnim.channels![2]; // path: TRANSLATION

    let sampler1 = gltfAnim.samplers![0]; // interpolation: LINEAR
    let sampler2 = gltfAnim.samplers![1]; // interpolation: STEP
    let sampler3 = gltfAnim.samplers![2]; // interpolation: LINEAR

    console.assert(channel1.extras.include)
    console.log(channel1.extras.include)
    assert_scalar_array_equal(channel1.extras.include![1], nodeAnim1.keyframes[1].include!);

    // assert channel targets
    console.assert(
        channel1.sampler === 0 && channel2.sampler === 1 && channel3.sampler === 2
    );
    console.assert(
        channel1.target.path == nodeAnim1.path && channel2.target.path == nodeAnim1.path
        && channel3.target.path == nodeAnim2.path
    );
    // assert sampler interpolation types
    console.assert(sampler1.interpolation == nodeAnim1.keyframes![0].interpType &&
        sampler2.interpolation == nodeAnim1.keyframes![3].interpType &&
        sampler3.interpolation == nodeAnim2.keyframes![0].interpType
    );
    // assert sampler input/output indices
    console.assert(sampler1.input === 0 && sampler1.output === 1 &&
        sampler3.input === 4 && sampler3.output === 5
    );

    // assert accessors
    const accessors = gltf.accessors!;
    console.assert(accessors.length === gltfAnim.samplers!.length*2); // 2 accessors (time, animation) per sampler/channel
    // time bufferviews are the same (index 0)
    console.assert(
        accessors[0].bufferView === 0 && accessors[2].bufferView === 0 &&
        accessors[4].bufferView === 0 &&
        accessors[0].type === DataType.SCALAR && accessors[2].type === DataType.SCALAR &&
        accessors[4].type === DataType.SCALAR
    );
    // rotation bufferview
    console.assert(accessors[1].bufferView === 1 && accessors[3].bufferView === 1
        && accessors[1].type === DataType.VEC4 && accessors[3].type === DataType.VEC4
    );
    // translation bufferview
    console.assert(accessors[5].bufferView === 2 && accessors[5].type === DataType.VEC3);
    console.assert(accessors[5].min![0] === 1 && accessors[5].max![2] === 6);

    {
        let count = accessors[0].count;
        console.assert(count === accessors[1].count && count === 3);
        console.assert(accessors[2].byteOffset === 3 * 4 && accessors[3].byteOffset === 3 * 4 * 4)
        count = accessors[2].count;
        console.assert(count === accessors[3].count && count === 2);
        console.assert(accessors[4].byteOffset === (3+2) * 4 && accessors[5].byteOffset === 0);
        count = accessors[4].count;
        console.assert(count === accessors[5].count && count === 2);
    }

    let num_time = 7;
    let num_vec4 = 5;
    let num_vec3 = 2;
    let time_bytes = num_time * 4;
    let vec3_bytes = num_vec3 * 3 * 4;
    let vec4_bytes = num_vec4 * 4 * 4;
    let total_bytes = time_bytes + vec3_bytes + vec4_bytes;
    // assert accessors

    Promise.all(gltf.extras.promises).then(()=>{
        const buffer = gltf.buffers![0];
        console.assert(gltf.bufferViews!.length === 3);
        const bufferView1 = gltf.bufferViews![0];
        const bufferView2 = gltf.bufferViews![1];
        const bufferView3 = gltf.bufferViews![2];
        console.assert(bufferView1.buffer === 0 && bufferView2.buffer === 0 && bufferView3.buffer === 0);

        console.assert(buffer.byteLength === total_bytes);
        console.assert(bufferView1.byteLength === time_bytes);
        console.assert(bufferView2.byteLength === vec4_bytes);
        console.assert(bufferView3.byteLength === vec3_bytes);
        console.assert(bufferView2.byteOffset === time_bytes);
        console.assert(bufferView3.byteOffset === time_bytes + vec4_bytes);
        // console.log(gltf);
        // console.log(buffer.uri);
        console.log("PASSED")
    })

    // GLTFUtils.exportGLTF(asset, {bufferOutputType: GLTFUtils.BufferOutputType.DataURI}).then((value)=>{
    //     console.log(value["model.gltf"]);
    // })
}

function animation_cubicspline_test() {
    const asset = new GLTFUtils.GLTFAsset();
    const scene = new GLTFUtils.Scene();

    asset.addScene(scene);

    let gltf = createGLTF(asset);

    let x = 1;
    let y = 2;
    let z = 3;

    const node = new GLTFUtils.Node();
    node.setTranslation(x, y, z);
    node.setRotationRadians(x, y, z);
    node.setScale(x, y, z);
    scene.addNode(node);

    let nodeAnim1 = new GLTFUtils.Animation(Transformation.TRANSLATION);
    let keyframes = [
        {
            time: -0.2,
            value: [1,2,3],
            interpType: InterpolationMode.STEP,
        },
        {
            time: 0,
            value: [1,2,3],
            interpType: InterpolationMode.CUBICSPLINE,
            rightTangent: [0.1,0.2,0.3],
            leftTangentWeight: [0.22,0.4,0.6],
            include: [0, 2]
        },
        {
            time: 0.2,
            value: [4,5,6],
            interpType: InterpolationMode.CUBICSPLINE,
            rightTangent: [0.5,0.3,0.3],
            leftTangent: [-0.2,0.2,0.2],
        },
        {
            time: 0.4,
            value: [7,8,9],
            interpType: InterpolationMode.CUBICSPLINE,
            leftTangent: [0.5,0.5,0.5]
        },
        {
            time: 0.6,
            value: [1,2,3],
            interpType: InterpolationMode.LINEAR,
        },
    ];
    nodeAnim1.addKeyframes(keyframes)
    node.animations = [nodeAnim1];

    addScenes(gltf, asset);

    const accessors = gltf.accessors!;
    const BV = gltf.bufferViews!;
    const time_accessor = accessors[2];
    const anim_accessor = accessors[3];
    const time_BV = BV[0];
    const anim_BV = BV[1];

    console.assert(time_accessor.count === anim_accessor.count);

    // Promise.all(gltf.extras.promises).then(()=>{
    //     // console.assert(time_BV.byteLength * 3 * 3 === anim_BV.byteLength);
    // });

    // console.log(gltf)
    GLTFUtils.exportGLTF(asset, {bufferOutputType: GLTFUtils.BufferOutputType.DataURI}).then((value)=>{
        let out = JSON.parse(value["model.gltf"])
        let anim_samplers = out.animations[0].samplers;
        console.assert(anim_samplers!.length === 3 && anim_samplers[1].extras.tangents);

        let tangent_acc_id = anim_samplers[1].extras.tangents;
        let tangent_accessor = out.accessors[tangent_acc_id]

        console.log(out)

        console.assert(tangent_accessor.count === 3 * 3); // 3 cubicspline keyframes * 3 floats (for vector3)
        const BV = out.bufferViews![tangent_accessor.bufferView];
        const buffer = out.buffers![BV.buffer];
        const uri = decodeURI(buffer.uri);
        let sdata = atob(uri.split(",")[1]) // decode to byte array
        
        const byteOffset = BV.byteOffset + tangent_accessor.byteOffset
        const size = tangent_accessor.count * 4 * 4; // vec4 * 4 bytes (float32)
        sdata = sdata.slice(byteOffset, byteOffset+size)
        const uint_array = new Uint8Array(sdata.length)
        for(let i = 0; i < sdata.length; ++i) uint_array[i] = sdata.charCodeAt(i)
        // console.log(enc, byteOffset, size, uint_array.length, sdata.length, enc.encode(sdata.slice(byteOffset, byteOffset+100)).length)

        let data = new Float32Array(uint_array.buffer); // rightTangent, rightTangentWeight, leftTangent, leftTangentWeight
        assert_scalar_equal(data[0], keyframes[1].rightTangent![0]) // keyframe 1, vec3.x, rightTangent
        assert_scalar_equal(data[1], Animation.DEFAULT_TANGENT_WEIGHT) // keyframe 1, vec3.x, rightTangentWeight
        assert_scalar_equal(data[2], Animation.DEFAULT_TANGENT) // keyframe 1, vec3.x, leftTangent
        assert_scalar_equal(data[3], keyframes[1].leftTangentWeight![0]) // keyframe 1, vec3.x, leftTangentWeight
        assert_scalar_equal(data[4], keyframes[1].rightTangent![1]) // keyframe 1, vec3.y, rightTangent
        assert_scalar_equal(data[8], keyframes[1].rightTangent![2]) // keyframe 1, vec3.z, rightTangent
        assert_scalar_equal(data[12], keyframes[2].rightTangent![0]) // keyframe2, vec3.x, rightTangent
        assert_scalar_equal(data[14], keyframes[2].leftTangent![0]) // keyframe2, vec3.x, leftTangent

        // console.log(data, BV, buffer);
        
        // download(value["model.gltf"], "yolo.gltf");
    })
}

function skin_test() {
    let M = new GLTFUtils.Matrix(4);

    const asset = new GLTFUtils.GLTFAsset();
    const scene = new GLTFUtils.Scene();

    asset.addScene(scene);

    const node = new GLTFUtils.Node("Root");
    const node2 = new GLTFUtils.Node("Skeleton");
    const node3 = new GLTFUtils.Node("Pelvis");
    const node4 = new GLTFUtils.Node("LeftLeg");
    const node5 = new GLTFUtils.Node("RightLeg");

    const xnode = new GLTFUtils.Node("Light");
    xnode.setTranslation(1,2,3);

    node.setTranslation(0.1,0.2,-3);
    node.setRotationDegrees(20,30,-40);
    node3.setScale(0.8,0.8,0.8)

    scene.addNode(node);
    scene.addNode(xnode);

    node.addNode(node2);
    node2.addNode(node3);
    node3.addNode(node4);
    node3.addNode(node5);

    let skin_name = "Skin0";
    node.skin = new GLTFUtils.Skin(node2, skin_name);

    {
        let gltf = createGLTF(asset);
        addScenes(gltf, asset);
        let joints = gltf.skins![0].joints!;
        const nodeIndex = gltf.extras.nodeIndices.get(node);
        const node2Index = gltf.extras.nodeIndices.get(node2);
        console.assert(nodeIndex === 0 && gltf.skins![0].skeleton === node2Index);
        console.assert(joints.length == 4 && joints[0] === node2Index);
    }

    const parentNode = new GLTFUtils.Node("Parent");
    parentNode.addNode(node);
    scene.removeNode(node); // remove node from scene children, since no longer root
    scene.addNode(parentNode);

    node.skin.skeletonNode = null; // set skeleton root to 'node'

    {
        let gltf = createGLTF(asset);
        addScenes(gltf, asset);
        let joints = gltf.skins![0].joints!;
        const nodeIndex = gltf.extras.nodeIndices.get(node);
        console.assert(nodeIndex === 2);
        console.assert(joints.length == 5 && joints[0] === nodeIndex);
    }

    let x = 10;
    let y = 20;
    let z = -30;
    // use row major to store
    node3.inverseBindMatrix = new GLTFUtils.Matrix4x4(); // add some inverse bind matrices
    node3.inverseBindMatrix.data[0][3] = x; // set x translation
    node3.inverseBindMatrix.data[1][3] = y; // set y translation
    node3.inverseBindMatrix.data[2][3] = z; // set z translation
    // set skeleton root back to node2
    node.skin.skeletonNode = node2;
    {
        let gltf = createGLTF(asset);

        addScenes(gltf, asset);

        let joints = gltf.skins![0].joints!;
        Promise.all(gltf.extras.promises).then(()=>{
            let buffer = gltf.buffers![0];
            let accessor = gltf.accessors![0];
            console.assert(gltf.skins![0].inverseBindMatrices === 0);
            console.assert(buffer.byteLength === joints.length * 4 * 16);
            console.assert(accessor.count === joints.length);
            // GLTF stores as column major (index 12 = M03, 13 = M13, 14 = M23)
            console.assert(accessor.max![12] == x && accessor.max![13] == y && accessor.min![14] == z);
            console.log(gltf)
        })
    }

    let nodeAnim1 = new GLTFUtils.Animation(Transformation.ROTATION);
    let keyframes = [
        {
            time: 0,
            value: [1,2,3,4],
            interpType: InterpolationMode.LINEAR
        },
        {
            time: 0.2,
            value: [2,3,4,5],
            interpType: InterpolationMode.LINEAR
        },
        {
            time: 0.4,
            value: [2,3,4,5],
            interpType: InterpolationMode.LINEAR
        },
        {
            time: 0.6,
            value: [1,2,3,4],
            interpType: InterpolationMode.STEP
        }
    ];
    nodeAnim1.addKeyframes(keyframes)
    nodeAnim1.addKeyframe(0.8, [1,2,3,4], InterpolationMode.STEP);

    let nodeAnim2 = new GLTFUtils.Animation(Transformation.TRANSLATION);
    keyframes = [
        {
            time: 0,
            value: [1,2,3],
            interpType: InterpolationMode.LINEAR
        },
        {
            time: 0.3,
            value: [4,5,6],
            interpType: InterpolationMode.LINEAR
        }
    ];
    nodeAnim2.addKeyframes(keyframes)

    let nodeAnim3 = new GLTFUtils.Animation(Transformation.SCALE);
    keyframes = [
        {
            time: 0,
            value: [10,20,30], // degrees
            interpType: InterpolationMode.CUBICSPLINE
        },
        {
            time: 0.3,
            value: [40,50,60], // degrees
            interpType: InterpolationMode.CUBICSPLINE
        }
    ]
    nodeAnim3.addKeyframes(keyframes)
    node.animations = [nodeAnim1, nodeAnim2];
    node2.animations = [nodeAnim3];

    GLTFUtils.exportGLTF(asset, {bufferOutputType: GLTFUtils.BufferOutputType.DataURI}).then((value)=>{
        console.log(value["model.gltf"]);
        // download(value["model.gltf"], "yolo.gltf");
    })
}


function matrix_test() {
    const Matrix = GLTFUtils.Matrix;
    let rows = 4;
    let M = new Matrix(rows);
    M.data[0][0] = 1;
    console.assert(Matrix.IsIdentity(M));
    M.data[0][0] = 2;
    console.assert(!Matrix.IsIdentity(M));
    M.data[0][0] = 1;
    M.data[0][1] = 0.0001;
    console.assert(!Matrix.IsIdentity(M));
}

// matrix_test();
// test1();
animation_test();
animation_cubicspline_test();
// skin_test();