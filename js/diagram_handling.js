function diagramHandling(diagram) {
    // add some eventlistener for generated elements
    $(document).on("click", "." + diagram.diagramDivId + "check-parent-input", function () {  // if parent of a checkboxgroup is selected, (un)select all
        let groupName = "group" + $(this).attr("id");
        let checked = $(this).is(":checked");
        toggleCheckElementsOfClass(groupName, checked);
        $("." + groupName).each(function () {
            toggleLine($(this).attr("id").split(id_sep).slice(-1)[0], checked ? 1 : 0, diagram.diagramDivId);
        }).promise().done(diagram.rescaleY());
    });
    $(document).on("click", "." + diagram.diagramDivId + "check-child-input", function () {  // if click on child-checkbox maybe toggle parent and child
        $(this).parent().siblings().find(".check-parent-input").prop("checked", false);
        toggleLine($(this).attr("id").split(id_sep).slice(-1)[0], $(this).is(":checked") ? 1 : 0, diagram.diagramDivId);
        diagram.rescaleY();
    });
    $(document).on("change", "#" + diagram.diagramDivId + "diagramCodeSelectPicker", function () {  // change displaying codes <-> bezeichner
        let label, newLabel, key;
        const preSelected = this.value === "Codes" ? "displayCodes" : "codes";  // what was selected before
        const selected = this.value === "Codes" ? "codes" : "displayCodes";
        $("#" + diagram.diagramDivId + "selectDiagramCol .dropdown-item .form-check-label").each(function () {  // change inner-label-text for every checkbox
            label = $(this).text();
            key = value_groups["labObservations"][preSelected].indexOf(label) >= 0 ? "labObservations" : "observations";
            newLabel = value_groups[key][selected][value_groups[key][preSelected].indexOf(label)];
            $(this).html($(this).html().replace(label, newLabel));
        });
    });
    $(document).on("click", "." + diagram.diagramDivId + "parentShowGroup", function () {  // collapse a checkbox group
        const div = $(this).closest("div.check-parent");
        let img = div.find("img");
        if (img.attr("src") === "../images/down-arrow.svg") {
            img.attr("src", "../images/left-arrow.svg");
        } else {
            img.attr("src", "../images/down-arrow.svg");
        }
        toggleElementsOfClass(div.attr("id"));
    });
    $(document).on("click", "#" + diagram.diagramDivId + "showRangeCheckbox", function () {  // show/hide normed limits
        toggleAllRangeLimits($(this).is(":checked") ? 1 : 0, diagram.diagramDivId);
        diagram.rescaleY();
    });
    $(document).on("click", "#" + diagram.diagramDivId + "showResourceCheckbox", function () {  // show/hide resource data points
        $(this).is(":checked") ? diagram.setAlignData([]) : diagram.setAlignData(align_data);
    });
}

//helper functions for creating a diagram
function getPreparedData() {
    let prepData = {};
    const keys = Object.keys(data).filter(n => !["patient", "values"].includes(n));
    for (let key in keys) {
        prepData[keys[key]] = Object.entries(data[keys[key]]).map((e) => e[1]);
    }
    return prepData;
}

function nestData(someData, targetAttr = "code") {
    return d3.nest()  // group data by code
        .key(function (d) {
            return d[targetAttr];
        })
        .entries(someData);
}

function getColors(cnt, paramS = "100%", paramL = "50%") {
    function makeColor(nr, cntTotal) {
        if (cntTotal < 1) cntTotal = 1;
        return nr * (360 / cntTotal) % 360;
    }

    let colors = [];
    for (let i = 0; i < cnt; i++) {
        colors.push("hsl( " + makeColor(i, cnt) + ", " + paramS + ", " + paramL + " )");
    }
    return colors
}

function getAllColValues(relData, referenceData) {  // function used to get comparable values, e. g. all dates (referenceData: date_columns)
    const cols = Object.keys(referenceData);
    let allData = [];
    let dataId;
    for (let key in cols) {
        dataId = cols[key];
        for (let i = 0; i < referenceData[dataId].length; i++) {
            allData = allData.concat(Object.entries(relData[dataId]).map((e) => e[1][referenceData[dataId][i]]));
        }
    }
    return allData;
}

function createCheckboxList(pltData, diagramPrefix) {
    let cntColorElem = 0, colorElem = [];
    for (let key in value_groups) {
        value_groups[key]["data"] = nestData(pltData[key]);
        value_groups[key]["codes"] = value_groups[key]["data"].map(e => e["key"]);
        value_groups[key]["displayCodes"] = [];
        for (let j = 0; j < value_groups[key]["codes"].length; j++) {  // TODO wenn kein display oder code vorhanden, siehe 2 Zeilen drüber, nehme unknown...
            value_groups[key]["displayCodes"].push(pltData[key].filter(e => e.code === value_groups[key]["codes"][j])[0]["display"]);
        }
        colorElem = colorElem.concat(value_groups[key]["codes"]);
        cntColorElem += value_groups[key]["data"].length;
    }
    let colorMapping = {
        "colorList": getColors(cntColorElem),
        "codeList": colorElem
    };
    for (let j = 0; j < cntColorElem; j++) {
        colorMapping[colorElem[j]] = colorMapping["colorList"][j];
    }
    for (let key in value_groups) {
        const parentName = value_groups[key]["name"];
        let addHtml = "<div>" + getCheckboxGroupHtml("check-group check-parent", parentName, true, diagramPrefix);
        for (let i = 0; i < value_groups[key]["data"].length; i++) {
            addHtml += getCheckboxGroupHtml(key, value_groups[key]["data"][i], false, diagramPrefix, colorMapping[value_groups[key]["data"][i]["key"]]);
        }
        document.getElementById(diagramPrefix + "selectDiagramCol").innerHTML += addHtml + "</div>";
    }
    return colorMapping;
}

function getCheckboxGroupHtml(divClass, value, parentNode = false, diagramPrefix, color = null) {
    let result;
    if (parentNode) {
        result = "<div class='" + divClass + "' id='divgroup" + diagramPrefix + id_sep + value + "'><input class='form-check-input " + diagramPrefix + "check-parent-input' type='checkbox' value='" + value + "' id='" + diagramPrefix + id_sep + value + "'>" +
            "<img src='../images/down-arrow.svg' alt='&lt;' class='select-svg " + diagramPrefix + "parentShowGroup'><label class='form-check-label parentShowGroup' style='width: 90%'><h6>" + value + "</h6></label></div>";
    } else {  // color option only for children
        let display = value["values"][0]["display"];
        display = (!display || display === "") ? value["key"] : display;
        value = value["key"];
        const div = "group" + diagramPrefix + id_sep + value_groups[divClass]["name"];
        result = "<div class='dropdown-item check-group div" + div + "'><input class='form-check-input " + diagramPrefix + "check-child-input " + div + "' type='checkbox' value='" + value + "' id='" + diagramPrefix + id_sep + value + "'>" +
            "<label class='form-check-label' for='" + diagramPrefix + id_sep + value + "'>";
        if (value_groups[divClass]["marker"] === "circle") {
            result += "<div class='check-color-symbol' style='background:" + color + "'></div>" + display + "</label></div>";
        } else {  // marker === "rect"
            result += "<div class='check-color-symbol-rect' style='background:" + color + "'></div>" + display + "</label></div>";
        }
    }
    return result;
}

function addDiagram() {
    let div = document.querySelector("#diagramContainer");
    let newId = !$(div).children().length ? "diagram0" : "diagram" + (parseInt($(div).find(":last-child").find(".diagramElement").attr("id").split("diagram")[1]) + 1);
    let template = document.querySelector("#diagramTemplate").content;
    div.appendChild(document.importNode(template, true));
    $(div).find("#diagram").attr("id", newId);
    $(div).find("#selectDiagramCol").attr("id", newId + "selectDiagramCol");
    $(div).find("#diagramCodeSelectPicker").attr("id", newId + "diagramCodeSelectPicker");
    $(div).find("#showRangeCheckbox").attr("id", newId + "showRangeCheckbox");
    $(div).find("#showResourceCheckbox").attr("id", newId + "showResourceCheckbox");
    $(div).find("#svgFrameSlider").attr("id", newId + "svgFrameSlider");
    $(div).find("#startDateSlider").attr("id", newId + "startDateSlider");
    $(div).find("#endDateSlider").attr("id", newId + "endDateSlider");
    const diagram = new Diagram(getPreparedData(data), newId);
    diagramHandling(diagram);
}

$(document).on("click", ".btn-remove-diagram", function () {
    $(this).closest("div.diagramRow").remove();
    let div = document.querySelector("#diagramContainer");
    if (!$(div).children().length) addDiagram();
});
