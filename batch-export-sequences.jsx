#target premierepro

(function () {
    // --- Helpers ---
    function sanitizeName(name) {
        // Remove characters illegal in filenames on Win/Mac
        return name.replace(/[\\\/:\*\?"<>\|]/g, "_");
    }

    function ensureAME() {
        try {
            // Ask Premiere to bring AME up (no-op if already running)
            app.encoder.launchEncoder();
            return true;
        } catch (e) {
            alert("Could not launch Adobe Media Encoder. Is it installed?\n\n" + e);
            return false;
        }
    }

    // --- Guards ---
    if (!app.project) { alert("Open a Premiere Pro project first."); return; }
    if (!app.project.sequences || app.project.sequences.numSequences === 0) {
        alert("No sequences found. Create at least one sequence and try again.");
        return;
    }

    // --- Pick output folder and preset ---
    var outFolder = Folder.selectDialog("Choose an output folder for exports");
    if (!outFolder) { return; }

    var presetFile = File.openDialog("Choose an Adobe Media Encoder preset (.epr)", "*.epr");
    if (!presetFile) { alert("No preset selected. Export canceled."); return; }

    if (!ensureAME()) { return; }

    // --- Queue all sequences ---
    var total = app.project.sequences.numSequences;
    var queued = 0;

    for (var i = 0; i < total; i++) {
        var seq = app.project.sequences[i];
        if (!seq) { continue; }

        var base = sanitizeName(seq.name || ("Sequence_" + (i + 1)));
        var outPath =
            outFolder.fsName + "/" + base + ".mp4"; // extension can be anything; AME uses preset settings

        // encodeSequence(seq, outputPath, presetPath, removeOnCompletion [, useAME])
        // Some versions support a 5th boolean (use Media Browser). Safest is to pass 4 args.
        try {
            var ok = app.encoder.encodeSequence(seq, outPath, presetFile.fsName, 1);
            if (ok) { queued++; }
        } catch (e) {
            // Fallback signatures (older/newer builds differ slightly)
            try {
                var ok2 = app.encoder.encodeSequence(seq, outPath, presetFile.fsName, false /*remove when done*/);
                if (ok2) { queued++; }
            } catch (e2) {
                // As a last resort you could make this the active sequence and call encodeActiveSequence
                // but we'll just report the failure for clarity.
                alert("Failed to queue: " + (seq.name || ("Sequence_" + (i + 1))) + "\n" + e2);
            }
        }
    }

    if (queued === 0) {
        alert("No sequences were queued. Check your preset and try again.");
        return;
    }

    // --- Start the batch in AME ---
    try {
        app.encoder.startBatch();
        alert("Queued " + queued + " sequence(s) to Adobe Media Encoder.\nOutput folder:\n" + outFolder.fsName);
    } catch (e3) {
        alert("Sequences queued, but I couldn't start the batch automatically.\nOpen AME and press Start.\n\n" + e3);
    }
})();
