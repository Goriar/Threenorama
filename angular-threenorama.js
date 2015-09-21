(function() {
  var module;

  module = angular.module('ngThreenorama', []);

  module.service('ngThreenorama', function() {
    return new NGTScene();
  });

  module.directive('ngThreenorama', function(ngThreenorama, $window) {
    var directive;
    return directive = {
      transclude: true,
      scope: {
        src: '=',
        zoom: '=',
        zoomStep: '=',
        start: '=',
        end: '='
      },
      link: function(scope, element, attrs, ctrl, transcludeFn) {
        var canvas, getMousePos, mouseDown, mouseDrag, mouseMove, mouseUp, resize, sourceChanged, zoomChanged;
        if (scope.zoomStep == null) {
          scope.zoomStep = 1;
        }
        if (scope.zoom == null) {
          scope.zoom = 50;
        }
        if (scope.start == null) {
          scope.start = {
            tilt: 0,
            pan: 0
          };
        }
        if (scope.end == null) {
          scope.end = {
            tilt: 0,
            pan: 0
          };
        }
        scope.moveCenter = function() {
          return ngThreenorama.ngtCamera.moveCenter();
        };
        scope.moveUp = function() {
          return ngThreenorama.ngtCamera.moveUp();
        };
        scope.moveDown = function() {
          return ngThreenorama.ngtCamera.moveDown();
        };
        scope.moveLeft = function() {
          return ngThreenorama.ngtCamera.moveLeft();
        };
        scope.moveRight = function() {
          return ngThreenorama.ngtCamera.moveRight();
        };
        scope.zoomIn = function() {
          return scope.zoom -= scope.zoomStep;
        };
        scope.zoomOut = function() {
          return scope.zoom += scope.zoomStep;
        };
        scope.sliderChange = function() {
          return scope.zoom = scope.sliderValue;
        };
        sourceChanged = function() {
          return ngThreenorama.changeImage(scope.src);
        };
        resize = function() {
          return ngThreenorama.resizeWindow(element[0].clientWidth, element[0].clientHeight);
        };
        zoomChanged = function() {
          ngThreenorama.ngtCamera.setZoom(scope.zoom);
          return scope.sliderValue = scope.zoom;
        };
        getMousePos = function(event) {
          var x, y;
          x = event.pageX - element[0].offsetLeft - element[0].offsetParent.offsetLeft;
          y = event.pageY - element[0].offsetTop - element[0].offsetParent.offsetTop;
          return [x, y];
        };
        mouseDown = function(event) {
          var xy;
          xy = getMousePos(event);
          return ngThreenorama.mouseDown(new THREE.Vector2(xy[0], xy[1]));
        };
        mouseUp = function(event) {
          var xy;
          xy = getMousePos(event);
          return ngThreenorama.mouseUp(new THREE.Vector2(xy[0], xy[1]));
        };
        mouseMove = function(event) {
          var xy;
          xy = getMousePos(event);
          return ngThreenorama.mouseMove(new THREE.Vector2(xy[0], xy[1]));
        };
        mouseDrag = function(event) {
          var xy;
          xy = getMousePos(event);
          return ngThreenorama.mouseDrag(new THREE.Vector2(xy[0], xy[1]));
        };
        canvas = angular.element('<canvas>')[0];
        ngThreenorama.init();
        element.append(ngThreenorama.renderer.domElement);
        resize();
        element[0].onmousedown = mouseDown;
        element[0].onmouseup = mouseUp;
        element[0].onmousemove = mouseMove;
        element[0].onmousedrag = mouseDrag;
        ngThreenorama.onChangeRect = function() {
          return scope.$apply(function() {
            scope.start.tilt = ngThreenorama.ngtAnchors.startTilt;
            scope.start.pan = ngThreenorama.ngtAnchors.startPan;
            scope.end.tilt = ngThreenorama.ngtAnchors.endTilt;
            return scope.end.pan = ngThreenorama.ngtAnchors.endPan;
          });
        };
        scope.$watch('zoom', zoomChanged);
        scope.$watch('src', sourceChanged);
        $window.onresize = resize;
        return transcludeFn(scope, function(clonedTranscludeTemplate) {
          return element.append(clonedTranscludeTemplate);
        });
      }
    };
  });

}).call(this);
