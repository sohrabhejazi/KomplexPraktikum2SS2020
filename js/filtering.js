function conditionContentFilter() {
	if ($("#conditionFilter").is(":checked")) {
		$("#conditionContent").show();
	} else {
        $("#conditionContent").hide();
    }
}

function observationContentFilter() {
	if ($("#observationFilter").is(":checked")) {
		$("#observationContent").show();
	} else {
        $("#observationContent").hide();
    }
}

function medicationContentFilter() {
	if ($("#medicationFilter").is(":checked")) {
		$("#medicationContent").show();
	} else {
        $("#medicationContent").hide();
    }
}

function labObservationContentFilter() {
	if ($("#labObservationFilter").is(":checked")) {
		$("#labObservationContent").show();
	} else {
        $("#labObservationContent").hide();
    }
}

function antibiogramContentFilter() {
	if ($("#antibiogramFilter").is(":checked")) {
		$("#antibiogramContent").show();
	} else {
        $("#antibiogramContent").hide();
    }
}

function encounterContentFilter(encindex) {
	if ($("#encounterSelection" + encindex).is(":checked")) {
		$("#conditions" + encindex).show();
		$("#observations" + encindex).show();
		$("#medications" + encindex).show();
		$("#labObservations" + encindex).show();
		$("#antibiograms" + encindex).show();
	} else {
        $("#conditions" + encindex).hide();
        $("#observations" + encindex).hide();
        $("#medications" + encindex).hide();
        $("#labObservations" + encindex).hide();
        $("#antibiograms" + encindex).hide();
    }
}