import angular from 'angular';
require('./cubical');
import FocusbtnsController from './focusbtns.controller';
export default angular.module('shapesite', [])
    .controller('FocusbtnsController', FocusbtnsController);