import { ChevronRight } from "lucide-react";
import { NavLink } from "react-router";

type Source = {
  name: string;
  url: string;
  license: string;
  licenseUrl: string;
  /** Commit of the dataset the files are loaded from */
  revision: string;
  credit: string;
  notes: string;
};

/** Keep in sync with packages/db/prisma/catalog/selection.ts */
const sources: Source[] = [
  {
    name: "Smithsonian 3D models",
    url: "https://huggingface.co/datasets/cfahlgren1/smithsonian-3d-glb",
    license: "CC0-1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    revision: "18f91b07be69a28eed646eb1e60b5b36d3e70f31",
    credit:
      "Smithsonian Institution: National Museum of Natural History, National Museum of American History, National Air and Space Museum, Smithsonian Astrophysical Observatory, Smithsonian American Art Museum, Cooper Hewitt, Smithsonian Design Museum, and National Museum of Asian Art.",
    notes:
      "Open Access scans from the Smithsonian, repackaged as GLB files. The Smithsonian does not endorse ProjectX. CC0 covers the models, not Smithsonian trademarks or the publicity rights of any person shown.",
  },
  {
    name: "Atech SimReady Assets",
    url: "https://huggingface.co/datasets/atechdev/simready-assets",
    license: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    revision: "3404e3eb601f188a64147f826cecf0ccb921e5c6",
    credit: "Atech, SimReady Assets.",
    notes:
      "Electronics and robotics modules as GLB and STL files. Product names and descriptions were written for ProjectX; the models are unchanged.",
  },
  {
    name: "NVIDIA SimReady Assets",
    url: "https://huggingface.co/datasets/nvidia/simready-assets",
    license: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    revision: "0d89dfd87fb0ae28596f9d94cdb9bd60d44a7188",
    credit:
      "NVIDIA, original author. Web GLB copies by codepawl (huggingface.co/datasets/codepawl/simready-glb).",
    notes:
      "Tools, kitchenware, office supplies, auto parts and safety gear. The GLB copies are converted and compressed from NVIDIA's USD files without changing what they show. The revision above is the pinned commit of the GLB copies.",
  },
];

const linkClass =
  "underline underline-offset-2 transition-colors hover:text-slate-900 dark:hover:text-white";

export function CreditsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8 lg:px-[120px]">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex items-center gap-1.5 text-slate-500 text-sm dark:text-slate-400"
        >
          <NavLink
            to="/"
            className="transition-colors hover:text-slate-900 dark:hover:text-white"
          >
            Home
          </NavLink>
          <ChevronRight className="h-4 w-4 flex-shrink-0" aria-hidden />
          <span className="text-slate-900 dark:text-white">Credits</span>
        </nav>

        <h1 className="font-bold text-4xl text-slate-900 tracking-tight dark:text-white">
          Credits
        </h1>
        <p className="mt-4 text-[15px] text-slate-600 leading-7 dark:text-slate-300">
          Every product in the ProjectX demo catalog is a 3D model published
          under an open license. Each product page names its source and license.
          Prices are for demo print orders: checkout runs in Stripe test mode
          and nothing is made or shipped. The model files are free to download
          under their license.
        </p>

        <div className="mt-10 space-y-10">
          {sources.map((source) => (
            <section key={source.name} aria-labelledby={source.name}>
              <h2
                id={source.name}
                className="font-semibold text-slate-900 text-xl dark:text-white"
              >
                {source.name}
              </h2>
              <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-[15px] text-slate-600 dark:text-slate-300">
                <dt className="text-slate-500 dark:text-slate-400">License</dt>
                <dd>
                  <a
                    href={source.licenseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`font-mono ${linkClass}`}
                  >
                    {source.license}
                  </a>
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">Credit</dt>
                <dd>{source.credit}</dd>
                <dt className="text-slate-500 dark:text-slate-400">Dataset</dt>
                <dd>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className={linkClass}
                  >
                    {source.url.replace("https://", "")}
                  </a>
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">Revision</dt>
                <dd className="break-all font-mono text-sm">
                  {source.revision}
                </dd>
              </dl>
              <p className="mt-4 text-slate-500 text-sm leading-6 dark:text-slate-400">
                {source.notes}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
