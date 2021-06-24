'use strict';

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

import {
  OrbitControls
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/OrbitControls.js';

function main() {
  // create WebGLRenderer
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });

  // create camera
  const fov = 75;
  const aspect = 2;
  const near = 1.1;
  const far = 50;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 7;

  // create OrbitControls
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0); // OrbitControls가 카메라를 움직일 때 카메라의 시선을 (0, 0, 0)에 고정함.
  controls.update();

  // create scene
  const scene = new THREE.Scene();

  // create directional light(직사광)
  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
  }

  // 큐브 메쉬 생성에 필요한 박스 지오메트리 생성
  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  // 이름표 요소들의 부모노드이자 컨테이너로 사용할 #label 을 가져옴
  const labelContainerElem = document.querySelector('#labels');

  // 큐브 메쉬를 만들고, 각 큐브 메쉬의 이름을 textContent로 추가할 이름표 요소도 생성한 뒤, 큐브 메쉬와 이름표 요소를 객체로 묶어 리턴해주는 함수
  function makeInstance(geometry, color, x, name) {
    const material = new THREE.MeshPhongMaterial({
      color
    });

    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    cube.position.x = x;

    // 이름표 요소를 생성한 뒤, 전달받은 name을 텍스트로 넣어 줌
    const elem = document.createElement('div');
    elem.textContent = name;
    labelContainerElem.appendChild(elem); // 이름표 컨테이너에 자식노드로 추가해 줌.

    // 큐브 메쉬와 이름표 요소를 객체로 묶어 리턴해 줌.
    return {
      cube,
      elem
    };
  }

  // 생성한 큐브 메쉬와 이름표 요소를 담아놓을 배열. 이전 예제와는 다르게 이름 문자열도 같이 넘겨주도록 바꿈.
  const cubes = [
    makeInstance(geometry, 0x44aa88, 0, 'Aqua Colored Box'),
    makeInstance(geometry, 0x8844aa, -2, 'Purple Colored Box'),
    makeInstance(geometry, 0xaa8844, 2, 'Gold Colored Box'), // 이름을 더 길게 바꿔서 이름표 요소들이 서로 겹치게 함으로써, 큐브 메쉬의 깊이값에 따라 렌더가 되는지 확인한 뒤 이름표 요소의 z-index를 조정해줄거임.
  ];

  // resize renderer
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  // 각 큐브 메쉬들의 전역공간상의 좌표값 및 그것을 카메라 공간 좌표계를 정규화한 NDC 좌표값을 할당해 줄 Vector3 객체. tempV는 임시 vector값이라는 temporary vector3의 약자겠지 뭐
  const tempV = new THREE.Vector3();

  // 이름표의 정규화된 위치값 지점에서 카메라로 RayCaster 광선을 쏜 후, 처음 걸리는 물체가 이름표와 맵핑되는 큐브라면 이름표를 보이도록 하고, 그렇지 않다면 보이지 않도록 하려는 것.
  // 즉, 맵핑되는 이름표의 위치값에서 쐈는데 처음 교차하는 물체가 맵핑되는 큐브가 아니라는 건, 다른 큐브에 의해서 둘 사이가 가려졌다는 거니까 그런 경우에는 이름표를 보이면 안되는 거겠지
  const raycaster = new THREE.Raycaster();

  // animate
  function animate(t) {
    t *= 0.001; // 밀리초 단위 타임스탬프값을 초 단위로 변환

    // 렌더러가 리사이징됬을 때 변경된 사이즈에 맞춰서 카메라 비율(aspect)도 업데이트 해줌
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix(); // 카메라의 값을 바꿔줬으면 업데이트를 항상 호출해줘야 함.
    }

    // 각 큐브 메쉬들을 회전시키고, 각 큐브 메쉬에 매칭되는 이름표 요소들의 위치값을 계산해 줌.
    cubes.forEach((cubeInfo, index) => {
      // 참고로 cubes에는 각 큐브 메쉬와 이름표 요소가 묶인 객체들이 들어있으므로, 그것을 cubeInfo라는 이름으로 받고 있는거임.
      const {
        cube,
        elem
      } = cubeInfo;
      const speed = 1 + index * 0.1;
      const rotate = t * speed;
      cube.rotation.x = rotate;
      cube.rotation.y = rotate; // 각 큐브 메쉬들마다 속도값을 계산해서 매 프레임마다 x, y 방향으로 회전시켜 줌.

      // Object3D.updateWorldMatrix(updateParents, updateChildren)는 해당 객체의 전역 transform(위치, 회전, 크기 변경 등)이 바뀌면 그거를 업데이트해줌. 
      // 위에서 회전을 시켜주고 있으니까 전역 transform을 업데이트 해줘야 아래에서 업데이트된 전역공간 좌표값을 얻을 수 있겠지
      // 이때 부모노드나 자식노드의 전역 transform도 업데이트 해주고 싶다면 각각의 자리에 boolean값읗 전달해 줌. cube는 부모노드가 scene으로 존재하지만 자식노드는 없으니 각각 true, false를 넣어준 것
      cube.updateWorldMatrix(true, false);
      // Object3D.getWorldPosition(Vector3)는 전달한 Vec3에 객체의 전역공간상의 좌표값을 구해서 복사해 줌.
      // 왜 큐브의 전역공간 좌표값을 구하려는걸까? 아래에서 project 메서드로 큐브의 NDC 좌표값을 구하려면 큐브의 전역공간 좌표값이 필요함.
      cube.getWorldPosition(tempV);

      /**
       * Vector3.project(camera)
       * 
       * 이 메서드는 뭐냐면, 전역공간상의 좌표값 Vector3를 전달해 준 카메라를 기준으로 한 Camera Space의 NDC 좌표값으로 변환해주는 거임.
       * 
       * 이때, camera space는 뭐고, NDC 좌표값은 뭘까?
       * 이 개념들은 결국 컴퓨터 그래픽스에서 3차원 공간을 2차원 모니터로 표현할 때 거치는 여러 공간변환 과정들 중 하나라고 보면 됨.
       * 이 공간변환 과정을 Perspective Projection이라고도 함. 
       * 
       * 이를 좀 더 자세하게 설명하면 다음과 같음.
       * 
       * 1. 일단 어떤 물체의 전역공간상의 좌표값을 카메라 공간(camera space)의 좌표값으로 변환해야 함.
       * 이 뜻은 뭐냐면, 기존의 전역공간상의 원점을 기준으로 한 전역공간 좌표값을 카메라 위치를 원점으로 하는 좌표계의 좌표값으로 변환하여 계산해준다는 뜻.
       * 이 좌표값을 이용해서 2D 화면 상에서의 물체의 좌표값을 구할 수 있음.
       * 
       * 2. 이 좌표값을 (-1, -1, -1)에서 (1, 1, 1)까지의 좌표값으로 구성된 큐브공간안의 좌표값으로 또 변환해주어야 하는데, 이를 Clip Space 또는 NDC 공간이라고 함.
       * 이런 큐브 공간안에 좌표값이라면 결국 -1 ~ 1 사이의 값으로 구성될거고, 이는 결국 좌표값을 '정규화(normalized)'했다고 볼 수 있음.
       * 참고로 여전히 카메라의 위치값이 원점이고, 카메라를 화면의 정가운데 있는 것으로 가정하고 있으므로,
       * x = -1은 화면 맨 왼쪽을, y = -1은 화면 맨 아래쪽을 의미함.
       * 
       * 이 과정까지 해서 정규화된 NDC 공간 좌표값을 구해주는 게 project 메서드의 역할임.
       * 
       * 그럼 왜 정규화된 값으로 구해주는 걸까?
       * 사용자마다 화면의 해상도가 각각 다를 것이기 때문에, 이러한 해상도 차이에 빠르게 대응하려면 정규화된 값을 사용하는 게 여러모로 편리함.
       * 왜냐면 정규화된 좌표값에 그냥 2D화면 또는 캔버스의 해상도를 곱해주면 해당 캔버스상의 좌표값으로 구할 수 있기 때문임.
       * 
       * 자세한 내용은 NDC 관련 자료 북마크 참고
       */
      tempV.project(camera);

      raycaster.setFromCamera(tempV, camera); // 정규화된 이름표 위치값 지점에서 카메라의 절두체 안으로 광선을 쏴줌
      const intersectedObjects = raycaster.intersectObjects(scene.children); // 씬 안의 모든 자식노드들에 대해서 광선 교차 여부를 체크하고, 교차하는 객체들 순서로 배열을 만들어서 리턴해 줌.
      // 일단 교차하는 물체들이 존재하고, 맵핑되는 큐브와 첫번째로 광선이 교차하는 물체가 같다면 true를 할당하고, 아니라면 false를 할당함.
      const show = intersectedObjects.length && cube === intersectedObjects[0].object;

      // show값이 false이거나, 또는 큐브 메쉬의 정규화된 z좌표값이 절두체의 정규화된 z좌표값 범위(당연히 실제 좌표값 범위가 뭐가 됬든 -1 ~ 1 사이겠지)를 넘어선다면 이름표 요소를 숨김.
      // 왜냐? 큐브 메쉬가 절두체 범위를 벗어나면(즉, 정규화된 z좌표값의 절댓값이 1을 벗어난 경우겠지? 근데 애초에 이러면 '정규화된 좌표값'이라고 하면 안되긴 하지만..) 화면에서 안보일텐데, 이름표만 보이면 안되니까
      if (!show || Math.abs(tempV.z) > 1) {
        elem.style.display = 'none'; // 이름표를 숨김
      } else {
        elem.style.display = ''; // 이름표를 보이게 함.
      }

      // 정규화된 좌표값에 캔버스의 css 사이즈를 곱해줌으로써, 캔버스 상의 좌표값으로 변환하는 것.
      // 다만 x좌표값의 경우, 왼쪽 끝이 -1, 오른쪽 끝이 1이지만, 캔버스 좌표계는 왼쪽 끝이 0, 오른쪽 끝이 1로 정규화되어야 어떤 해상도를 곱하던 캔버스상의 좌표값으로 나올 수 있겟지?
      // 그래서 아래는 -1 ~ 1을 0 ~ 1로 변환해주는 공식인거임.
      // 마찬가지로 y좌표값의 경우, 위쪽 끝이 1, 아래쪽 끝이 -1이지만, 캔버스 좌표계는 위쪽 끝이 0, 아래쪽 끝이 1로 되어야겠지? 
      // 그래서 y좌표값도 1 ~ -1을 0 ~ 1로 변환해주는거임.
      const x = (tempV.x * 0.5 + 0.5) * canvas.clientWidth;
      const y = (tempV.y * -0.5 + 0.5) * canvas.clientHeight;

      // 이름표 요소를 위에서 구한 캔버스상의 좌표값으로 옮겨줌.
      // 이때, translate(-50%, -50%)로 해주는 이유는, 모든 DOM요소는 항상 왼쪽 상단 모서리를 기준으로 offset을 주기 때문에 x, y 좌표값을 이름표 요소의 가운데로 오게 하려면 (-50%, -50%)을 추가로 옮겨줘야 함.
      elem.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;

      // 이름표 요소들 간의 z-index를 정리해서 각 큐브 메쉬의 깊이와 매칭이 되어야 함.
      // 이때, 큐브 메쉬의 정규화된 z좌표값은 -1 ~ 1이고, NDC 공간의 Z축은 카메라 공간의 Z축과 반대여서 -1이 카메라의 near, 1은 far에 해당함.
      // 그러면 정규화된 z좌표값 -1 ~ 1을 100000 ~ 0 사이의 정수값 범위로 변환해서 각 이름표 요소의 z-index값으로 할당해주면 어떨까?
      // 왜냐면, 정규화된 z좌표값 자체가 -1 ~ 1 사이의 소수점 단위의 값이므로 충분히 큰 숫자 범위로 구분해주지 않으면 정수값이 동일한 비슷한 값의 z-index가 지정될 수 있음.
      // 그렇기 때문에 100000 ~ 0 사이의 값으로 범위를 확 넓혀준 것이고, z-index는 정수값만 받을 수 있으므로 비트연산자(z-index | 0)로 소수점 부분을 제거해 줌.
      elem.style.zIndex = (-tempV.z * 0.5 + 0.5) * 100000 | 0;
    });

    renderer.render(scene, camera);

    requestAnimationFrame(animate); // 내부에서 반복 호출
  }

  requestAnimationFrame(animate);
}

main();