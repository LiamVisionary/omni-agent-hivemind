"use client";

import type { Dispatch, ElementType, FormEvent, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { CloseIconButton } from "@/components/ui/close-icon-button";
import type { SkillBrowserSkill } from "@/features/dashboard/dashboard-types";

type SkillBrowserModalProps = {
  Button: ElementType;
  Copy: ElementType;
  Download: ElementType;
  GitBranch: ElementType;
  Image: ElementType;
  LoaderCircle: ElementType;
  RefreshCcw: ElementType;
  Sparkles: ElementType;
  addWrittenSkillToBrain: () => void | Promise<void>;
  filteredSkillBrowserSkills: SkillBrowserSkill[];
  fleetClass: (...names: string[]) => string;
  hermesUpdateRequired: boolean;
  hermesUpdateRequiredDetail: string;
  importRemoteSkillToBrain: (skill: SkillBrowserSkill) => void | Promise<void>;
  installGithubSkillToBrain: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  openSkillBrowser: () => void | Promise<void>;
  setSkillBrowserGithubOpen: Dispatch<SetStateAction<boolean>>;
  setSkillBrowserGithubUrl: Dispatch<SetStateAction<string>>;
  setSkillBrowserOpen: Dispatch<SetStateAction<boolean>>;
  setSkillBrowserSearch: Dispatch<SetStateAction<string>>;
  skillBrowserGithubInstalling: boolean;
  skillBrowserGithubOpen: boolean;
  skillBrowserGithubUrl: string;
  skillBrowserImporting: string;
  skillBrowserLoading: boolean;
  skillBrowserOpen: boolean;
  skillBrowserSearch: string;
  skillBrowserStatus: string;
  skillBrowserView: "browse" | "write";
  skillBrowserWrittenContent: string;
  skillBrowserWriting: boolean;
  skillRequiresHermesUpdate: (skill: SkillBrowserSkill, hermesUpdateRequired: boolean) => boolean;
  setSkillBrowserView: Dispatch<SetStateAction<"browse" | "write">>;
  setSkillBrowserWrittenContent: Dispatch<SetStateAction<string>>;
  vaultClass: (...names: string[]) => string;
};

export function SkillBrowserModal(props: SkillBrowserModalProps) {
  const { Button, Copy, Download, GitBranch, Image, LoaderCircle, RefreshCcw, Sparkles, addWrittenSkillToBrain, filteredSkillBrowserSkills, fleetClass, hermesUpdateRequired, hermesUpdateRequiredDetail, importRemoteSkillToBrain, installGithubSkillToBrain, openSkillBrowser, setSkillBrowserGithubOpen, setSkillBrowserGithubUrl, setSkillBrowserOpen, setSkillBrowserSearch, setSkillBrowserView, setSkillBrowserWrittenContent, skillBrowserGithubInstalling, skillBrowserGithubOpen, skillBrowserGithubUrl, skillBrowserImporting, skillBrowserLoading, skillBrowserOpen, skillBrowserSearch, skillBrowserStatus, skillBrowserView, skillBrowserWrittenContent, skillBrowserWriting, skillRequiresHermesUpdate, vaultClass } = props;
  const portalTarget = typeof document === "undefined" ? null : document.body;

  if (!portalTarget) return null;

  return createPortal((<>
      {skillBrowserOpen ? (
        <div
          className={fleetClass("setupModalBackdrop")}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSkillBrowserOpen(false);
          }}
        >
          <section className={fleetClass("setupModal", "skillBrowserModal")} role="dialog" aria-modal="true" aria-labelledby="skill-browser-title">
            <div className={fleetClass("setupModalHeader")}>
              <div className={fleetClass("skillBrowserTitle")}>
                <Image src="/icons/queen-bee-v2.png" alt="" width={46} height={46} unoptimized />
                <div>
                  <p className="eyebrow">Shared brain</p>
                  <h2 id="skill-browser-title">Skill Browser</h2>
                  <p>Add reusable operational skills to the shared Obsidian brain.</p>
                </div>
              </div>
              <CloseIconButton aria-label="Close skill browser" onClick={() => setSkillBrowserOpen(false)} />
            </div>
            {skillBrowserView === "browse" ? <div className={fleetClass("skillBrowserSearch")}>
              <input
                value={skillBrowserSearch}
                onChange={(event) => setSkillBrowserSearch(event.target.value)}
                placeholder="Search skills, tools, runtimes, workflows..."
                autoFocus
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSkillBrowserGithubOpen((open) => !open)}
                disabled={skillBrowserGithubInstalling}
              >
                <GitBranch aria-hidden="true" />
                Install From Github
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSkillBrowserGithubOpen(false);
                  setSkillBrowserView("write");
                }}
              >
                <Sparkles aria-hidden="true" />
                Write Skill
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={openSkillBrowser} disabled={skillBrowserLoading}>
                {skillBrowserLoading ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <RefreshCcw aria-hidden="true" />}
                Refresh
              </Button>
            </div> : null}
            {skillBrowserView === "browse" && skillBrowserGithubOpen ? (
              <form className={fleetClass("skillBrowserGithubForm")} onSubmit={(event) => void installGithubSkillToBrain(event)}>
                <input
                  value={skillBrowserGithubUrl}
                  onChange={(event) => setSkillBrowserGithubUrl(event.target.value)}
                  placeholder="https://github.com/owner/repo/tree/main/skills/example"
                  aria-label="GitHub skill URL"
                />
                <Button type="submit" disabled={skillBrowserGithubInstalling || !skillBrowserGithubUrl.trim()}>
                  {skillBrowserGithubInstalling ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Download aria-hidden="true" />}
                  {skillBrowserGithubInstalling ? "Installing" : "Install"}
                </Button>
              </form>
            ) : null}
            {skillBrowserStatus || hermesUpdateRequired ? (
              <div className={fleetClass("skillBrowserNotices")}>
                {skillBrowserStatus ? <p className={fleetClass("skillBrowserStatus")}>{skillBrowserStatus}</p> : null}
                {hermesUpdateRequired ? (
                  <p className={fleetClass("skillBrowserStatus", "skillBrowserWarning")}>Hermes update available: {hermesUpdateRequiredDetail}. Update-gated skills are marked before you add them to the brain.</p>
                ) : null}
              </div>
            ) : null}
            {skillBrowserView === "write" ? (
              <div className={fleetClass("skillWriterPanel")}>
                <textarea
                  value={skillBrowserWrittenContent}
                  onChange={(event) => setSkillBrowserWrittenContent(event.target.value)}
                  placeholder={[
                    "---",
                    "name: My Skill",
                    "description: Use when...",
                    "---",
                    "",
                    "# My Skill",
                    "",
                    "## When to use",
                    "",
                    "## Steps",
                    "",
                    "## Notes",
                  ].join("\n")}
                  autoFocus
                />
                <div className={fleetClass("setupModalActions", "skillWriterActions")}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setSkillBrowserWrittenContent("");
                      setSkillBrowserView("browse");
                    }}
                    disabled={skillBrowserWriting}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void addWrittenSkillToBrain()} disabled={skillBrowserWriting || !skillBrowserWrittenContent.trim()}>
                    {skillBrowserWriting ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Download aria-hidden="true" />}
                    Add Skill
                  </Button>
                </div>
              </div>
            ) : (
            <div className={fleetClass("skillBrowserGrid")}>
              {skillBrowserLoading ? (
                <div className={fleetClass("scheduleEmpty")}><LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /><strong>Loading skills</strong><p>Checking installed skills and community catalogs.</p></div>
              ) : filteredSkillBrowserSkills.length ? filteredSkillBrowserSkills.map((skill) => {
                const needsHermesUpdate = skill.requiresHermesUpdate || skillRequiresHermesUpdate(skill, hermesUpdateRequired);
                return (
                  <article key={`${skill.source}-${skill.id}`} className={fleetClass("skillBrowserCard")}>
                    <div className={fleetClass("skillBrowserMetaRow")}>
                      <Image src="/icons/worker-bee-general-v2.png" alt="" width={24} height={24} unoptimized />
                      <span>{skill.source}{skill.category ? ` · ${skill.category}` : ""}</span>
                      {needsHermesUpdate ? <small className={fleetClass("skillUpdateBadge")}>Needs Hermes update</small> : null}
                    </div>
                    <strong>{skill.name}</strong>
                    <p>{skill.description || "No description provided yet."}</p>
                    <div className={fleetClass("scheduleActions")}>
                      <Button type="button" size="sm" onClick={() => void importRemoteSkillToBrain(skill)} disabled={skill.imported || skillBrowserImporting === skill.id}>
                        {skillBrowserImporting === skill.id ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Download aria-hidden="true" />}
                        {skill.imported ? "In brain" : "Add to brain"}
                      </Button>
                      {skill.githubUrl || skill.skillMdUrl ? (
                        <Button type="button" size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(skill.githubUrl || skill.skillMdUrl || "")}>
                          <Copy aria-hidden="true" />
                          Copy source
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              }) : (
                <div className={fleetClass("scheduleEmpty")}><Sparkles aria-hidden="true" /><strong>No skills found</strong><p>Try a different search, or import from provider installs below the shared skills shelf.</p></div>
              )}
            </div>
            )}
          </section>
        </div>
      ) : null}
  </>), portalTarget);
}
