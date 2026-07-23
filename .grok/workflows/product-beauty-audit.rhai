// ArkGate product-beauty audit — report-only by default.
// Criteria: docs/product-voice.md (one path, doctor control plane, progressive disclosure,
// senior English, no false done).
//
// Launch: /workflow product-beauty-audit
// Smoke: workflow tool with name "product-beauty-audit" and validate_only: true

let meta = #{
    name: "product-beauty-audit",
    description: "Read-only audit of ArkGate product surfaces against product-voice (one path, doctor control plane, progressive disclosure)",
    when_to_use: "Before or after a product-surface release; re-run anytime to score README, doctor, router, skills, agent-guide voice",
    phases: [
        #{ title: "Audit", detail: "parallel read-only surface audits" },
        #{ title: "Propose", detail: "synthesize findings into a ranked report" },
    ],
};

let findings_schema = #{
    "type": "object",
    "required": ["findings"],
    "properties": #{
        "findings": #{
            "type": "array",
            "maxItems": 12,
            "items": #{
                "type": "object",
                "required": ["file", "issue", "severity", "suggested_fix"],
                "properties": #{
                    "file": #{ "type": "string" },
                    "issue": #{ "type": "string" },
                    "severity": #{ "type": "string" },
                    "suggested_fix": #{ "type": "string" },
                },
            },
        },
        "surface": #{ "type": "string" },
        "summary": #{ "type": "string" },
    },
};

let report_schema = #{
    "type": "object",
    "required": ["title", "overall", "findings", "next_actions"],
    "properties": #{
        "title": #{ "type": "string" },
        "overall": #{ "type": "string" },
        "findings": #{
            "type": "array",
            "maxItems": 40,
            "items": #{
                "type": "object",
                "required": ["file", "issue", "severity", "suggested_fix"],
                "properties": #{
                    "file": #{ "type": "string" },
                    "issue": #{ "type": "string" },
                    "severity": #{ "type": "string" },
                    "suggested_fix": #{ "type": "string" },
                },
            },
        },
        "next_actions": #{
            "type": "array",
            "maxItems": 8,
            "items": #{ "type": "string" },
        },
        "markdown": #{ "type": "string" },
    },
};

// Optional args.root defaults to workspace root prose; agents are told to use repo-relative paths.
let root_hint = ".";
if args != () && args.root != () {
    root_hint = args.root;
}

// --- voice criteria embedded so cold agents do not invent vibes marketing ---
let voice_rules = "";
voice_rules += "Product-voice criteria (must enforce; empty findings only after reading the files):\n";
voice_rules += "1. ONE primary path: start -> doctor -> optional /ark-autopilot; no skill-shopping as default curriculum.\n";
voice_rules += "2. Doctor is the control plane: one status light, one primary next action; Suggest/Adapt/Enforce are lights not settings.\n";
voice_rules += "3. Progressive disclosure: compact router first; full /ark-* pack is expert depth.\n";
voice_rules += "4. No false done: design-weak / residual must not read as healthy finished; Enforce != elegant design.\n";
voice_rules += "5. Senior English: contract, gate, edges, baseline, pilot, mechanical-safe, fail-closed. Avoid vibes, emoji rain, fake familiarity, magic auto-refactor claims.\n";
voice_rules += "6. Template: [plain fact]. [precise term + implication]. [one next action].\n";
voice_rules += "Severity: high | medium | low. suggested_fix must be concrete (file + edit intent).\n";

phase("Audit");
log("Auditing product surfaces under " + root_hint + " (read-only)");

let surfaces = [
    #{
        id: "readme",
        paths: "README.md",
        focus: "hero, only-flow, status lights, expert skills section, post-green Shape door",
    },
    #{
        id: "product-voice",
        paths: "docs/product-voice.md",
        focus: "canon completeness: lexicon, Do/Dont, doctor models, progressive disclosure",
    },
    #{
        id: "doctor",
        paths: "bin/lib/doctor-plan.mjs and bin/lib/post-green-path.mjs",
        focus: "human status-light copy, Primary next action, no false healthy under design-weak; JSON ids stable",
    },
    #{
        id: "compact-router",
        paths: "bin/lib/ci-and-commands.mjs compactAgentInstructions",
        focus: "primary path only; expert depth section; no full skill catalog dump",
    },
    #{
        id: "skills",
        paths: "templates/skills/ark-autopilot.md and templates/skills/ark-explore.md frontmatter + when/not when",
        focus: "autopilot=guided end-to-end; explore=map/post-green specialized; STOP handoffs preserved",
    },
    #{
        id: "agent-guide",
        paths: "docs/agent-guide.md default path and skill roles",
        focus: "matches README progressive disclosure; no contradicting second curriculum",
    },
    #{
        id: "package-surface",
        paths: "docs/package-surface.md claims that mention onboarding or skills",
        focus: "no false claims that full skills are default day-zero install",
    },
];

let audit_jobs = [];
for s in surfaces {
    let p = "";
    p += "You are auditing ArkGate product surface: " + s.id + ".\n";
    p += "Root hint: " + root_hint + ". Open and READ these paths with read_file/grep: " + s.paths + ".\n";
    p += "Also open docs/product-voice.md if present for criteria.\n";
    p += "Do NOT answer from memory. If a file is missing, report one high finding for the missing file.\n";
    p += "Focus: " + s.focus + ".\n";
    p += voice_rules;
    p += "Return findings[] with file, issue, severity (high|medium|low), suggested_fix. ";
    p += "Empty findings is valid ONLY after you read the files and found no voice/path violations. ";
    p += "Set surface to " + s.id + " and a one-line summary.";
    audit_jobs.push(#{
        prompt: p,
        label: "audit:" + s.id,
        capability_mode: "read-only",
        output_schema: findings_schema,
    });
}

let audit_results = parallel(audit_jobs);

let all_findings = [];
let surface_summaries = [];
let i = 0;
for r in audit_results {
    let sid = surfaces[i].id;
    if r == () || !r.success {
        all_findings.push(#{
            file: sid,
            issue: "Audit agent failed or returned no usable output for surface " + sid,
            severity: "high",
            suggested_fix: "Re-run product-beauty-audit; inspect host logs for surface " + sid,
        });
        surface_summaries.push(sid + ": agent-failed");
    } else {
        if r.output.findings != () {
            for f in r.output.findings {
                all_findings.push(f);
            }
        }
        let line = sid + ": ok";
        if r.output.summary != () {
            line = sid + ": " + r.output.summary;
        }
        surface_summaries.push(line);
    }
    i += 1;
}

log("Audit complete: " + all_findings.len().to_string() + " raw findings across " + surfaces.len().to_string() + " surfaces");

phase("Propose");

let synth_prompt = "";
synth_prompt += "You are the synthesis editor for an ArkGate product-beauty audit.\n";
synth_prompt += "Read docs/product-voice.md and skim README.md with read_file to ground the report.\n";
synth_prompt += "Raw findings JSON follows. Deduplicate, rank by severity (high first), drop noise, ";
synth_prompt += "and produce a professional report. Do not invent findings not supported by the raw list ";
synth_prompt += "unless a quick file read proves a clear contradiction with product-voice.\n";
synth_prompt += "overall must be one of: ship-ready | needs-fixes | blocked.\n";
synth_prompt += "next_actions: at most 5 concrete maintainer steps.\n";
synth_prompt += "markdown: full report in English senior voice (no vibes marketing).\n";
synth_prompt += "Surface summaries: " + json_encode(surface_summaries) + "\n";
synth_prompt += "Raw findings: " + json_encode(all_findings) + "\n";

let synth = agent(synth_prompt, #{
    label: "synthesize",
    capability_mode: "read-only",
    output_schema: report_schema,
});

if synth == () || !synth.success || synth.output == () {
    let fallback_md = "# Product beauty audit — incomplete\n\nSynthesis agent failed. Raw finding count: ";
    fallback_md += all_findings.len().to_string() + "\n";
    let path_fail = write_scratch_file("product-beauty-audit.md", fallback_md);
    complete(#{
        path: path_fail,
        overall: "blocked",
        findings_count: all_findings.len(),
        report: fallback_md,
    });
}

// Defensive: schema success still benefits from != () guards (create-workflow pitfall).
let out = synth.output;
let findings_out = if out.findings != () { out.findings } else { [] };
let next_out = if out.next_actions != () { out.next_actions } else { [] };
let overall_out = if out.overall != () { out.overall } else { "needs-fixes" };
let title_out = if out.title != () { out.title } else { "Product beauty audit" };

let md = out.markdown;
if md == () || md == "" {
    md = "# Product beauty audit\n\n";
    md += "Overall: " + overall_out + "\n\n";
    md += "## Findings\n";
    for f in findings_out {
        if f != () && f.file != () {
            let sev = if f.severity != () { f.severity } else { "medium" };
            let issue = if f.issue != () { f.issue } else { "(no issue text)" };
            let fix = if f.suggested_fix != () { f.suggested_fix } else { "(no fix)" };
            md += "- **" + sev + "** `" + f.file + "`: " + issue + " — " + fix + "\n";
        }
    }
    md += "\n## Next actions\n";
    for a in next_out {
        if a != () { md += "- " + a + "\n"; }
    }
}

let report_path = write_scratch_file("product-beauty-audit.md", md);
log("Wrote " + report_path);

complete(#{
    path: report_path,
    title: title_out,
    overall: overall_out,
    findings: findings_out,
    next_actions: next_out,
    findings_count: findings_out.len(),
    report: md,
});
