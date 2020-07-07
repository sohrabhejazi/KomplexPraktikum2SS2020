// get all selected code identifier (by selected checkboxes), that should be displayed)
function getSelectedCodeElements(diagramId) {
    return $("#" + diagramId + "selectDiagramCol").find("input." + diagramId + "check-child-input:checkbox:checked").map(function () {
        return $(this).val()
    }).get();
}

// hide/show a value_group with checkboxes
function toggleElementsOfClass(className, diagramId) {
    $("." + className).toggle();
}

// toggle all checkbox of a class (e. g. if parent is selected or unselected)
function toggleCheckElementsOfClass(className, checked) {
    $("." + className).prop("checked", checked);
}

// toggle a single line (via lineId) and its value-markers (points)
function toggleLine(lineId, display, diagramId) {
    d3.select("#path" + id_sep + diagramId + id_sep + lineId).style("opacity", display);
    d3.selectAll("#points" + id_sep + diagramId + id_sep + lineId).style("opacity", display);
    if ($("#" + diagramId + "showRangeCheckbox").is(":checked")) {
        toggleRangeLimits(lineId, display, diagramId);
    }
}

// toggle the normed range limits for a specific line
function toggleRangeLimits(lineId, display, diagramId) {
    for (let i = 0; i < rangeLimits.length; i++) {
        d3.select("#range" + rangeLimits[i] + id_sep + diagramId + id_sep + lineId).style("opacity", display);
    }
}

// toggle all range limits (via checkbox)
function toggleAllRangeLimits(display, diagramId) {
    let selectedLines = getSelectedCodeElements(diagramId);
    for (let i = 0; i < selectedLines.length; i++) {
        toggleRangeLimits(selectedLines[i], display, diagramId);
    }
}

var tooltip;

function createTooltip() {
    return d3.select("#tooltip-root")  // hover-tooltip
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip");
}

function mouseover() {
    tooltip.style("opacity", $(this).css("opacity"));
    tooltip.style("display", "unset");
}

function mousemove(d) {
    let elemClass = $($(this).get(0)).attr("id").split(id_sep)[0];
    tooltip.html(getHoverText(elemClass, d))
        .style("max-width", window.innerWidth - d3.event.pageX - style["margin"].left - style["margin"].right + "px")
        .style("left", d3.event.pageX + "px")
        .style("top", d3.event.pageY + 30 + "px");
}

function mouseleave() {
    tooltip.style("display", "none");
}

// getHoverText for a specific element and data-context (d)
function getHoverText(elemClass, d, primary = true) {  // if not primary, the return is just part of another hover-Text-string (if the part could also be main-string)
    let prefix, hover = "";
    switch (elemClass) {
        case "abgObservations":
            if (primary) {  // for hovering over one Antibiogramme-Resistenzen-Point, showing all abgObservations for that date: their Antibiotica + Result (R/S) + Date
                hover = d["values"].length === 1 ? "<b>Resistenz zu einem Antibiogramm-Ergebnis am " : "<b>Resistenzen zu Ergebnissen von Antibiogrammen am ";
                hover += d["key"] + "</b><br><table class='hoverTable'><tr><th>Antibiotikum</th><th>Ergebnis</th><th>Datum Antibiogramm-Ergebnis</th></tr>"
                let result;
                for (let i = 0; i < d["values"].length; i++) {
                    result = d["values"][i].interpretation === "R" ? "resistent" : "empfänglich";
                    hover += "<tr><td>" + d["values"][i].code + "</td><td>" + result + "</td><td>" + data["mibiObservations"][d["values"][i]["mibiObservation"]]["date"] + "</td></tr>";
                }
                hover += "</table>";
                return hover;
            } else {  // returns [alphabetic-sort-Array-of-Resistances, alphabetic-sort-Array-of-Non-Resistances]
                let resis = d.filter((d => d.interpretation === "R")).reduce((r, i) => r.concat(i.code), []);
                let nonResis = d.filter((d => d.interpretation === "S")).reduce((r, i) => r.concat(i.code), []);
                return [resis.sort(), nonResis.sort()]
            }
        case "code":
            if (primary) return d.display + " (" + d.code + ")<br>System: " + d.system + "<br>Version: " + d.version;
            return d.display + " (" + d.code + ")";
        case "conditions":
            let enc;
            hover = "<b>Diagnosen am " + d["key"] + "</b><br><br>";
            const sortedData = d["values"].sort((a, b) => (a.rank > b.rank) ? 1 : ((b.rank > a.rank) ? -1 : 0));
            hover += "<table class='hoverTable'><tr><th>Rang</th><th>Bezeichnung</th><th>Behandlungsfall</th></tr>";
            for (let i = 0; i < sortedData.length; i++) {
                enc = data["encounter"][sortedData[i].encounter]
                hover += "<tr><td>" + sortedData[i].rank + "</td><td>" + sortedData[i].display + " (" + sortedData[i].code + ")</td><td>" + enc.start + " - " + enc.end + "</td></tr>"
            }
            return hover + "</table>";
        case "encounter":
            if (primary) {
                return "<b>Behandlungsfall</b></br><table><tr><td>Von: </td><td>" + d.start + "</td></tr><tr><td>Bis: </td><td>" + d.end + "</td></tr></table>";
            } else {
                return "Behandlungsfall " + d.start + " - " + d.end;
            }
        case "labRequest":
            if (primary) {
                if (d["values"].length === 1) {
                    prefix = "<b>Laboranfrage vom " + d["key"] + "</b>";
                } else {
                    hover = "<b>Laboranfragen vom " + d["key"] + "</b>";
                    prefix = "Laboranfrage ";
                }
                for (let i = 0; i < d["values"].length; i++) {
                    hover += prefix + "<br>" + getHoverText("labRequest", d["values"][i], primary = false) + "<br>";
                    hover += getHoverText("encounter", data["encounter"][d["values"][i]["encounter"]], primary = false)
                }
            } else {
                hover = "Ergebnisse:<br><table class='hoverTable'><tr><th>Bezeichner</th><th>Wert</th><th>Datum</th></tr>";
                const labIds = Object.keys(data["labObservations"]).filter(n => data["labObservations"][n]["serviceRequest"] === d.id);
                let labObs;
                for (let i = 0; i < labIds.length; i++) {
                    labObs = data["labObservations"][labIds[i]];
                    hover += "<tr><td>" + labObs.display + " (" +  labObs.code + " )</td><td>";
                    hover += labObs["value"] + " " + data["values"][labObs.range]["unit"] + "</td><td>" + labObs.date + "</td></tr>";
                }
                hover += "</table>";
            }
            return hover
        case "medication":  // hover over one medication entry
            let apform = d.application.text === "iv" ? "intravenös" : (d.application.text === "po" ? "peroral" : d.application.text);
            hover = "<b>Medikament " + d["display"] + " (" + d["code"] + ")</b><br>";
            hover += "Dosis: " + d["dose"] + "<br>ab " + d["date"] + "<br>Anwendungsdauer: " + d["duration_in_d"] + " Tage<br>";
            hover += "Anwendungsintervall: " + d["interval_h"] + " Stunden<br>Anwendungsform: " + apform + "<br>";
            hover += "<br>" + getHoverText("encounter", data["encounter"][d["encounter"]], primary=false);
            return hover;
        case "mibiObservations":
            if (primary) { // for hovering over one Antibiogramme-Ergebnis-Point, showing all mibiObservations for that date: their Test + Ergebnis + Antibiogramm-Anforderungs-Datum
                hover = d["values"].length === 1 ? "<b>Ergebnis eines Antibiogramms am " : "<b>Ergebnisse von Antibiogrammen am ";
                hover += d["key"] + "</b><br><table class='hoverTable'><tr><th></th><th>Test</th><th>Ergebnis</th><th>Datum Anforderung</th></tr>"
                let mibiObs, rowspan;
                for (let i = 0; i < d["values"].length; i++) {
                    mibiObs = getHoverText("mibiObservations", d["values"][i], primary = false);
                    rowspan = mibiObs[2].length === 2 ? 3 : 1;
                    hover += "<tr><td rowspan='" + rowspan + "'><b>" + (i + 1) + "</b></td><td>" + mibiObs[0] + "</td><td>" + mibiObs[1] + "</td>";
                    hover += "<td>" + getHoverText("mibiRequest", data["mibiRequest"][d["values"][i]["serviceRequest"]], primary = false) + "</td></tr>";
                    if (rowspan > 1) {
                        hover += "<tr><td colspan='" + 3 + "'>Resistenzen: " + mibiObs[2][0].join(", ") + "</td></tr><tr><td colspan='" + 3 + "'>Empfänglich: " + mibiObs[2][1].join(", ") + "</td></tr>";
                    }
                }
                hover += "</table>"
            } else {  // returns for one mibiObservation: [Test, Ergebnis, Resistance]
                let diagData;
                diagData = data["diagnostics"][Object.keys(data["diagnostics"]).filter(k => data["diagnostics"][k]["result"] === d.id)[0]];
                hover = [diagData.display + " (" + diagData.code + ")", d.display + " (" + d.code + ")"];
                hover.push(d["abgObservations"].length ? getHoverText("abgObservations", d["abgObservations"].reduce((r, k) => r.concat(data["abgObservations"][k]), []), primary = false) : []);
            }
            return hover;
        case "mibiRequest":
            if (primary) {
                if (d["values"].length === 1) {
                    prefix = "<b>Anforderung eines Antibiogramms am " + d["key"] + "</b>";
                } else {
                    hover = "<b>Anforderung der Antibiogramme am " + d["key"] + "</b><br>";
                    prefix = "Antibiogramm ";
                }
                let mibiIds, mibiObs, mibi, rowspan;
                for (let i = 0; i < d["values"].length; i++) {
                    hover += prefix + "<br>" + getHoverText("specimen", data["specimen"][d["values"][i]["specimen"]]);
                    mibiIds = Object.keys(data["mibiObservations"]).filter(n => data["mibiObservations"][n]["serviceRequest"] === d["values"][i].id);
                    mibiObs = mibiIds.reduce((r, k) => r.concat(data["mibiObservations"][k]), []);
                    hover += "<table class='hoverTable'><tr><th></th><th>Test</th><th>Ergebnis</th><th>Behandlungsfall</th></tr>";
                    for (let j = 0; j < mibiObs.length; j++) {
                        mibi = getHoverText("mibiObservations", mibiObs[j], primary = false);
                        rowspan = mibi[2].length === 2 ? 3 : 1;
                        hover += "<tr><td rowspan='" + rowspan + "'><b>" + (j + 1) + "</b></td><td>" + mibi[0] + "</td><td>" + mibi[1] + "</td>";
                        hover += "<td>" + getHoverText("encounter", data["encounter"][mibiObs[j]["encounter"]], primary = false) + "</td></tr>";
                        if (rowspan > 1) {
                            hover += "<tr><td colspan='" + 3 + "'>Resistenzen: " + mibi[2][0].join(", ") + "</td></tr><tr><td colspan='" + 3 + "'>Empfänglich: " + mibi[2][1].join(", ") + "</td></tr>";
                        }
                    }
                    hover += "</table>"
                }
            } else {
                hover = d["authoredOn"];
            }
            return hover;
        case "points":
            const range = data["values"][d.range];
            hover = "<b>" + getHoverText("code", d, false) + "</b><br><br>";
            hover += "Wert: " + d.value + " " + range["unit"] + "<br>am " + d.date + "</b><br>";
            hover += getHoverText("values", range);
            if ("serviceRequest" in d) {
                hover += getHoverText("serviceRequest", data["labRequest"][d.serviceRequest])
            }
            hover += getHoverText("encounter", data["encounter"][d.encounter], primary = false);
            return hover;
        case "serviceRequest":
            return "Laboranfrage vom " + d["authoredOn"] + "<br>";
        case "values":
            hover = "<table>";
            hover += "low" in d ? "<tr><td>min-Normwert: </td><td>" + d.low + " " + d.unit + "</td></tr>" : "";
            hover += "high" in d ? "<tr><td>max-Normwert: </td><td>" + d.high + " " + d.unit + "</td></tr>" : "";
            return hover + "</table><br>";
        case "specimen":
            return getHoverText("code", d);
        default:
            return "";
    }
}
