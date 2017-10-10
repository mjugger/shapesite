export default class FocusbtnsController {
    constructor($timeout) {
        'ngInject';
        this.leftTextIntro = false;
        this.focusBtnIntros = false;
        this.permanentIntros = false;

        $timeout(() => {
            this.mainHompageIntro();
            this.permanentIntro();
            //this.focusBtnIntro();
        }, 1000);
    }

    permanentIntro() {
        this.permanentIntros = true;
    }

    mainHompageIntro() {
        this.leftTextIntro = true;
    }

    mainHompageOutro() {
        this.leftTextIntro = false;
        this.focusBtnIntro();
    }

    focusBtnIntro() {
        this.focusBtnIntros = true;
    }

    focusBtnOutro() {
        this.focusBtnIntros = false;
    }
}