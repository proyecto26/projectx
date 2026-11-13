/**
 * The curated 3D catalog: which assets from the pinned datasets become products,
 * with a readable name and a short description for each one.
 *
 * Sources: Smithsonian Open Access (CC0), Atech SimReady (CC BY 4.0) and NVIDIA
 * SimReady through its web GLB copies (CC BY 4.0).
 * `build.ts` joins this list with the dataset metadata and writes `catalog.json`.
 * To add a product, add an entry here and run `pnpm catalog:build`.
 * Left out on purpose: human remains and life casts, portraits and busts of real
 * people, religious figures, personal belongings, and artworks whose subject is
 * a real person's suffering (for example "The Dying Tecumseh", "Model of the
 * Greek Slave", "Old Arrow Maker").
 */

export const SMITHSONIAN = {
  dataset: "cfahlgren1/smithsonian-3d-glb",
  revision: "18f91b07be69a28eed646eb1e60b5b36d3e70f31",
  license: "CC0-1.0",
} as const;

export const ATECH = {
  dataset: "atechdev/simready-assets",
  revision: "3404e3eb601f188a64147f826cecf0ccb921e5c6",
  license: "CC-BY-4.0",
  credit: "Atech, SimReady Assets (CC BY 4.0)",
} as const;

export const NVIDIA = {
  /** Web GLB copies, converted and compressed from the source below */
  dataset: "codepawl/simready-glb",
  revision: "0d89dfd87fb0ae28596f9d94cdb9bd60d44a7188",
  source: "nvidia/simready-assets",
  license: "CC-BY-4.0",
  credit: "NVIDIA SimReady Assets (CC BY 4.0)",
} as const;

export type Category =
  | "Tools"
  | "Kitchen & Home"
  | "Desk & Office"
  | "Auto Parts"
  | "Safety Gear"
  | "Games & Toys"
  | "Maker Electronics"
  | "Sculpture & Design"
  | "Fossils"
  | "Shells & Corals"
  | "History"
  | "Air & Space";

export type Selected = {
  /** Asset id in the dataset: Smithsonian `id`, or Atech folder name */
  id: string;
  name: string;
  description: string;
  category: Category;
  tags: string[];
};

export const smithsonianSelection: Selected[] = [
  // Shells & Corals
  {
    id: "acanthascus-koltuni-9d1b798a",
    name: "Glass sponge (Acanthascus koltuni)",
    description:
      "Scan of a deep-sea glass sponge specimen from the NMNH invertebrate collection.",
    category: "Shells & Corals",
    tags: ["sponge", "marine", "specimen"],
  },
  {
    id: "acanthaster-brevispinus-50a5728c",
    name: "Short-spined sea star (Acanthaster brevispinus)",
    description:
      "Scan of a sea star specimen from the NMNH invertebrate collection.",
    category: "Shells & Corals",
    tags: ["sea star", "marine", "specimen"],
  },
  {
    id: "acostaea-pseudomulleria-dalyi-b3a05c85",
    name: "Freshwater oyster shell (Acostaea dalyi)",
    description:
      "Scan of a freshwater oyster shell from the NMNH invertebrate collection.",
    category: "Shells & Corals",
    tags: ["shell", "mollusk", "specimen"],
  },
  {
    id: "acropora-rhabdocyathus-murrayensis-e2fe113a",
    name: "Branching coral (Acropora murrayensis)",
    description:
      "Scan of a branching Acropora coral from the NMNH invertebrate collection.",
    category: "Shells & Corals",
    tags: ["coral", "reef", "specimen"],
  },
  {
    id: "acropora-cervicornis-31d1de41",
    name: "Staghorn coral (Acropora cervicornis)",
    description:
      "Scan of a staghorn coral branch from the NMNH invertebrate collection.",
    category: "Shells & Corals",
    tags: ["coral", "reef", "specimen"],
  },
  {
    id: "acropora-diomedeae-3d911744",
    name: "Reef coral (Acropora diomedeae)",
    description:
      "Scan of an Acropora reef coral from the NMNH invertebrate collection.",
    category: "Shells & Corals",
    tags: ["coral", "reef", "specimen"],
  },
  {
    id: "acropora-mangarevensis-193dd6e2",
    name: "Reef coral (Acropora mangarevensis)",
    description:
      "Scan of an Acropora reef coral from the NMNH invertebrate collection.",
    category: "Shells & Corals",
    tags: ["coral", "reef", "specimen"],
  },
  {
    id: "acropora-pagoensis-ea466b91",
    name: "Reef coral (Acropora pagoensis)",
    description:
      "Scan of an Acropora reef coral from the NMNH invertebrate collection.",
    category: "Shells & Corals",
    tags: ["coral", "reef", "specimen"],
  },
  // Fossils
  {
    id: "aetiocetus-cotylalveus-emlong-sternum-926b31df",
    name: "Early whale sternum (Aetiocetus cotylalveus)",
    description:
      "Scan of a fossil whale sternum from the NMNH paleobiology collection.",
    category: "Fossils",
    tags: ["fossil", "whale", "bone"],
  },
  {
    id: "albertocetus-meffordorum-19a6f17f",
    name: "Early toothed whale (Albertocetus meffordorum)",
    description:
      "Scan of a fossil toothed whale from the NMNH paleobiology collection.",
    category: "Fossils",
    tags: ["fossil", "whale"],
  },
  {
    id: "allosaurus-fragilis-marsh-1877-maxilla-1a090f67",
    name: "Allosaurus upper jaw (Allosaurus fragilis)",
    description:
      "Scan of an Allosaurus maxilla, the upper jaw bone, from the NMNH paleobiology collection.",
    category: "Fossils",
    tags: ["fossil", "dinosaur", "jaw"],
  },
  {
    id: "anthonya-cultriformis-gabb-36c95795",
    name: "Fossil clam (Anthonya cultriformis)",
    description:
      "Scan of a fossil bivalve shell from the NMNH paleobiology collection.",
    category: "Fossils",
    tags: ["fossil", "shell", "bivalve"],
  },
  {
    id: "anthonya-elongata-tenison-woods-23c39243",
    name: "Fossil clam (Anthonya elongata)",
    description:
      "Scan of a fossil bivalve shell from the NMNH paleobiology collection.",
    category: "Fossils",
    tags: ["fossil", "shell", "bivalve"],
  },
  {
    id: "aralia-kellingtoniana-newberry-saporta-marion-6b3b2ddd",
    name: "Fossil leaf (Aralia kellingtoniana)",
    description:
      "Scan of a fossil plant leaf from the NMNH paleobiology collection.",
    category: "Fossils",
    tags: ["fossil", "plant", "leaf"],
  },
  {
    id: "archaeopteryx-siemensii-dames-391660da",
    name: "Archaeopteryx fossil (Archaeopteryx siemensii)",
    description:
      "Scan of an Archaeopteryx specimen from the NMNH paleobiology collection.",
    category: "Fossils",
    tags: ["fossil", "bird", "dinosaur"],
  },
  {
    id: "archaeotherium-mortoni-leidy-1850-a-skull-0fc17c4b",
    name: "Archaeotherium skull (Archaeotherium mortoni)",
    description:
      "Scan of a fossil Archaeotherium skull from the NMNH paleobiology collection.",
    category: "Fossils",
    tags: ["fossil", "mammal", "skull"],
  },
  {
    id: "archaeotherium-sp-ba7962eb",
    name: "Archaeotherium fossil (Archaeotherium sp.)",
    description:
      "Scan of an Archaeotherium fossil from the NMNH paleobiology collection.",
    category: "Fossils",
    tags: ["fossil", "mammal"],
  },
  {
    id: "australophoca-changorum-valenzuela-toro-et-al-2016-d-0832cf77",
    name: "Fossil seal (Australophoca changorum)",
    description:
      "Scan of a fossil seal specimen from the NMNH paleobiology collection.",
    category: "Fossils",
    tags: ["fossil", "seal", "mammal"],
  },
  // Sculpture & Design
  {
    id: "armchair-with-slip-seat-2632d078",
    name: "Armchair with slip seat",
    description:
      "Scan of an armchair from the Cooper Hewitt, Smithsonian Design Museum.",
    category: "Sculpture & Design",
    tags: ["furniture", "chair", "design"],
  },
  {
    id: "baluster-vase-from-a-five-piece-garniture-f1980-190-194-d8c6393a",
    name: "Baluster vase",
    description:
      "Scan of a baluster vase from a five-piece garniture, National Museum of Asian Art.",
    category: "Sculpture & Design",
    tags: ["vase", "ceramic"],
  },
  {
    id: "beaker-shaped-vase-from-a-five-piece-garniture-d8c64b96",
    name: "Beaker-shaped vase",
    description:
      "Scan of a beaker-shaped vase from a five-piece garniture, National Museum of Asian Art.",
    category: "Sculpture & Design",
    tags: ["vase", "ceramic"],
  },
  {
    id: "ewer-349e8fa2",
    name: "Ewer",
    description:
      "Scan of a ewer, a pouring vessel, from the Cooper Hewitt, Smithsonian Design Museum.",
    category: "Sculpture & Design",
    tags: ["vessel", "design"],
  },
  {
    id: "girl-skating-e8d1f790",
    name: "Girl Skating, sculpture",
    description:
      "Scan of the sculpture Girl Skating from the Smithsonian American Art Museum.",
    category: "Sculpture & Design",
    tags: ["sculpture", "figure"],
  },
  {
    id: "kneeling-winged-monster-0dc68216",
    name: "Kneeling winged monster",
    description:
      "Scan of a kneeling winged monster figure from the National Museum of Asian Art.",
    category: "Sculpture & Design",
    tags: ["sculpture", "creature"],
  },
  {
    id: "kylix-547c78d1",
    name: "Kylix drinking cup",
    description:
      "Scan of a kylix, a shallow drinking cup, from the Cooper Hewitt, Smithsonian Design Museum.",
    category: "Sculpture & Design",
    tags: ["vessel", "cup"],
  },
  {
    id: "lidded-incense-burner-xianglu-with-geometric-decoration-and-ce850625",
    name: "Lidded incense burner (xianglu)",
    description:
      "Scan of a lidded incense burner with geometric decoration, National Museum of Asian Art.",
    category: "Sculpture & Design",
    tags: ["vessel", "bronze"],
  },
  {
    id: "panel-for-a-cabinet-door-dc9e437b",
    name: "Cabinet door panel",
    description:
      "Scan of a carved cabinet door panel from the Cooper Hewitt, Smithsonian Design Museum.",
    category: "Sculpture & Design",
    tags: ["panel", "relief", "design"],
  },
  // History
  {
    id: "baseball-81b195cd",
    name: "Baseball",
    description:
      "Scan of a baseball from the National Museum of American History.",
    category: "History",
    tags: ["sports", "ball"],
  },
  {
    id: "cher-ami-687b5a18",
    name: "Cher Ami, carrier pigeon",
    description:
      "Scan of Cher Ami, the World War I carrier pigeon, National Museum of American History.",
    category: "History",
    tags: ["bird", "history"],
  },
  {
    id: "chester-telegraph-relay-d44e9327",
    name: "Telegraph relay",
    description:
      "Scan of a Chester telegraph relay from the National Museum of American History.",
    category: "History",
    tags: ["telegraph", "electrical"],
  },
  {
    id: "cowbell-80c485f9",
    name: "Cowbell",
    description:
      "Scan of a cowbell instrument from the National Museum of American History.",
    category: "History",
    tags: ["instrument", "music"],
  },
  {
    id: "davenport-electric-motor-patent-132-a18922b9",
    name: "Davenport electric motor",
    description:
      "Scan of the Davenport electric motor patent model (US patent #132), National Museum of American History.",
    category: "History",
    tags: ["motor", "patent model", "electrical"],
  },
  {
    id: "de-la-fuente-sugar-beet-knife-4dafe5d9",
    name: "Sugar beet knife",
    description:
      "Scan of a sugar beet knife from the National Museum of American History.",
    category: "History",
    tags: ["tool", "agriculture"],
  },
  {
    id: "portable-desk-thomas-jefferson-used-to-draft-the-declaration-9a096c5a",
    name: "Portable writing desk",
    description:
      "Scan of the portable desk used to draft the Declaration of Independence, National Museum of American History.",
    category: "History",
    tags: ["desk", "furniture", "history"],
  },
  // Air & Space
  {
    id: "bell-x-1-6c69a6bb",
    name: "Bell X-1 aircraft",
    description:
      "Scan of the Bell X-1 rocket plane from the National Air and Space Museum.",
    category: "Air & Space",
    tags: ["aircraft", "rocket plane"],
  },
  {
    id: "cassiopeia-a-supernova-remnant-732d123d",
    name: "Cassiopeia A supernova remnant",
    description:
      "3D model of the Cassiopeia A supernova remnant from the Smithsonian Astrophysical Observatory.",
    category: "Air & Space",
    tags: ["astronomy", "supernova"],
  },
  {
    id: "chandra-x-ray-observatory-571330ee",
    name: "Chandra X-ray Observatory",
    description:
      "3D model of the Chandra X-ray Observatory from the Smithsonian Astrophysical Observatory.",
    category: "Air & Space",
    tags: ["spacecraft", "telescope"],
  },
  {
    id: "command-module-apollo-11-d8c63e8a",
    name: "Apollo 11 command module",
    description:
      "Scan of the Apollo 11 command module Columbia from the National Air and Space Museum.",
    category: "Air & Space",
    tags: ["spacecraft", "apollo"],
  },
  {
    id: "crab-nebula-6634445f",
    name: "Crab Nebula",
    description:
      "3D model of the Crab Nebula from the Smithsonian Astrophysical Observatory.",
    category: "Air & Space",
    tags: ["astronomy", "nebula"],
  },
  {
    id: "orbiter-space-shuttle-ov-103-discovery-d8c636ce",
    name: "Space Shuttle Discovery",
    description:
      "Scan of the Space Shuttle orbiter Discovery (OV-103) from the National Air and Space Museum.",
    category: "Air & Space",
    tags: ["spacecraft", "shuttle"],
  },
];

const atech = (
  id: string,
  name: string,
  description: string,
  tags: string[],
): Selected => ({
  id,
  name,
  description,
  category: "Maker Electronics",
  tags: ["electronics", ...tags],
});

export const atechSelection: Selected[] = [
  atech(
    "01_atech_board_14port",
    "Controller board, 14 ports",
    "Model of a 14-port controller board for maker projects.",
    ["board"],
  ),
  atech(
    "02_atech_board_10port",
    "Controller board, 10 ports",
    "Model of a 10-port controller board for maker projects.",
    ["board"],
  ),
  atech(
    "03_atech_board_8port",
    "Controller board, 8 ports",
    "Model of an 8-port controller board for maker projects.",
    ["board"],
  ),
  atech(
    "04_atech_soil_sensor",
    "Soil moisture sensor",
    "Model of a soil moisture sensor module.",
    ["sensor"],
  ),
  atech("05_atech_dc_motor", "DC motor", "Model of a small DC motor module.", [
    "motor",
  ]),
  atech(
    "06_atech_aht20",
    "AHT20 temperature and humidity sensor",
    "Model of an AHT20 temperature and humidity sensor module.",
    ["sensor"],
  ),
  atech(
    "07_atech_distance_sensor",
    "Distance sensor",
    "Model of a distance sensor module.",
    ["sensor"],
  ),
  atech(
    "08_atech_icm40608",
    "ICM-40608 motion sensor",
    "Model of an ICM-40608 motion sensor module.",
    ["sensor", "imu"],
  ),
  atech(
    "09_atech_scd40_air_quality",
    "SCD40 air quality sensor",
    "Model of an SCD40 CO2 and air quality sensor module.",
    ["sensor"],
  ),
  atech(
    "10_atech_robot_arm_integrator",
    "Robot arm integrator",
    "Model of a robot arm integrator module.",
    ["robotics"],
  ),
  atech(
    "11_atech_microphone",
    "Microphone module",
    "Model of a microphone module.",
    ["audio"],
  ),
  atech("12_atech_speaker", "Speaker module", "Model of a speaker module.", [
    "audio",
  ]),
  atech(
    "13_atech_neopixel",
    "NeoPixel LED module",
    "Model of an addressable RGB LED module.",
    ["led"],
  ),
  atech(
    "14_atech_rotary_encoder",
    "Rotary encoder",
    "Model of a rotary encoder module.",
    ["input"],
  ),
  atech(
    "15_atech_button",
    "Push button module",
    "Model of a push button module.",
    ["input"],
  ),
  atech(
    "16_atech_st7735_tft",
    "ST7735 TFT display",
    "Model of a small ST7735 TFT display module.",
    ["display"],
  ),
  atech(
    "17_atech_big_screen",
    "Large display module",
    "Model of a large display module.",
    ["display"],
  ),
  atech("18_atech_camera", "Camera module", "Model of a camera module.", [
    "camera",
  ]),
  atech(
    "19_atech_pir",
    "PIR motion sensor",
    "Model of a passive infrared motion sensor module.",
    ["sensor"],
  ),
  atech(
    "20_atech_stepper_motor",
    "Stepper motor",
    "Model of a stepper motor module.",
    ["motor"],
  ),
  atech(
    "21_atech_load_cell",
    "Load cell",
    "Model of a load cell for weight sensing.",
    ["sensor"],
  ),
  atech(
    "22_atech_micro_sd_card",
    "MicroSD card module",
    "Model of a microSD card module.",
    ["storage"],
  ),
  atech(
    "23_atech_usb_c",
    "USB-C connector module",
    "Model of a USB-C connector module.",
    ["power"],
  ),
  atech(
    "24_atech_power_jack",
    "Power jack module",
    "Model of a DC power jack module.",
    ["power"],
  ),
  atech(
    "25_atech_wheel_n20_50mm",
    "N20 wheel, 50 mm",
    "Model of a 50 mm wheel for N20 gear motors.",
    ["robotics", "wheel"],
  ),
  atech(
    "26_atech_n20_coupler",
    "N20 shaft coupler",
    "Model of a shaft coupler for N20 gear motors.",
    ["robotics"],
  ),
];

const nvidia = (
  id: string,
  name: string,
  description: string,
  category: Category,
  tags: string[],
): Selected => ({ id, name, description, category, tags });

/** NVIDIA SimReady assets, by `asset` name in codepawl/simready-glb */
export const nvidiaSelection: Selected[] = [
  // Tools
  nvidia(
    "handTool_hammer_crossPeen_a01",
    "Cross peen hammer",
    "Model of a cross peen hammer.",
    "Tools",
    ["hammer", "hand tool"],
  ),
  nvidia(
    "handTool_hammer_rubberMallet_a01",
    "Rubber mallet",
    "Model of a rubber mallet.",
    "Tools",
    ["hammer", "hand tool"],
  ),
  nvidia(
    "handTool_hexDriver_tHandle_a01",
    "T-handle hex driver set",
    "Model of a T-handle hex driver set in its stand.",
    "Tools",
    ["hex", "hand tool"],
  ),
  nvidia(
    "handTool_hexKey_lShape_assembled_a01",
    "L-shaped hex key set",
    "Model of a folded set of L-shaped hex keys.",
    "Tools",
    ["hex", "hand tool"],
  ),
  nvidia(
    "handTool_knife_retractableBlade_a01",
    "Retractable utility knife",
    "Model of a utility knife with a retractable blade.",
    "Tools",
    ["knife", "hand tool"],
  ),
  nvidia(
    "handTool_pliers_long_nose_a01",
    "Long nose pliers",
    "Model of a pair of long nose pliers.",
    "Tools",
    ["pliers", "hand tool"],
  ),
  nvidia(
    "handTool_pliers_locking_a01",
    "Locking pliers",
    "Model of a pair of locking pliers.",
    "Tools",
    ["pliers", "hand tool"],
  ),
  nvidia(
    "handTool_screwdriver_phillips_ph2_a01",
    "Phillips screwdriver PH2",
    "Model of a PH2 Phillips screwdriver.",
    "Tools",
    ["screwdriver", "hand tool"],
  ),
  nvidia(
    "handTool_wrench_adjustable_a01",
    "Adjustable wrench",
    "Model of an adjustable wrench.",
    "Tools",
    ["wrench", "hand tool"],
  ),
  nvidia(
    "handTool_torque_wrench_a01",
    "Torque wrench",
    "Model of a click-type torque wrench.",
    "Tools",
    ["wrench", "hand tool"],
  ),
  nvidia(
    "powerTool_drill_a01",
    "Cordless drill",
    "Model of a cordless drill.",
    "Tools",
    ["drill", "power tool"],
  ),
  nvidia(
    "powerTool_grinder_a01",
    "Angle grinder",
    "Model of an angle grinder.",
    "Tools",
    ["grinder", "power tool"],
  ),
  nvidia(
    "powerTool_heatGun_cordless_a01",
    "Cordless heat gun",
    "Model of a cordless heat gun.",
    "Tools",
    ["heat gun", "power tool"],
  ),
  nvidia(
    "testingTool_multimeter_digital_b01",
    "Digital multimeter",
    "Model of a digital multimeter with probes.",
    "Tools",
    ["multimeter", "electronics"],
  ),
  // Kitchen & Home
  nvidia(
    "kitchenware_kettle_a01",
    "Kettle",
    "Model of a stovetop kettle.",
    "Kitchen & Home",
    ["kitchen"],
  ),
  nvidia(
    "kitchenware_pan_a01",
    "Frying pan",
    "Model of a frying pan.",
    "Kitchen & Home",
    ["kitchen", "cookware"],
  ),
  nvidia(
    "kitchenware_rollingPin_a01",
    "Rolling pin",
    "Model of a wooden rolling pin.",
    "Kitchen & Home",
    ["kitchen", "baking"],
  ),
  nvidia(
    "kitchenware_cuttingBoard_a01",
    "Cutting board",
    "Model of a cutting board.",
    "Kitchen & Home",
    ["kitchen"],
  ),
  nvidia(
    "kitchenware_jug_a01",
    "Jug",
    "Model of a pouring jug.",
    "Kitchen & Home",
    ["kitchen"],
  ),
  nvidia(
    "dishware_mug_coffee_a01",
    "Coffee mug",
    "Model of a coffee mug.",
    "Kitchen & Home",
    ["mug", "tableware"],
  ),
  nvidia(
    "dishware_cup_tea_a01",
    "Teacup",
    "Model of a teacup.",
    "Kitchen & Home",
    ["cup", "tableware"],
  ),
  nvidia(
    "dishware_glass_wine_a01",
    "Wine glass",
    "Model of a wine glass.",
    "Kitchen & Home",
    ["glass", "tableware"],
  ),
  nvidia(
    "dishware_thermos_a01",
    "Thermos",
    "Model of an insulated thermos.",
    "Kitchen & Home",
    ["bottle"],
  ),
  nvidia(
    "container_jar_glass_gold_a01",
    "Glass jar with gold lid",
    "Model of a glass jar with a gold lid.",
    "Kitchen & Home",
    ["jar", "storage"],
  ),
  nvidia(
    "decor_candle_a01",
    "Pillar candle",
    "Model of a pillar candle.",
    "Kitchen & Home",
    ["decor", "candle"],
  ),
  nvidia(
    "misc_glass_vase_a01",
    "Glass vase",
    "Model of a glass vase.",
    "Kitchen & Home",
    ["decor", "vase"],
  ),
  nvidia(
    "storage_basket_fruitHanger_a01",
    "Two-tier fruit basket",
    "Model of a two-tier wire fruit basket.",
    "Kitchen & Home",
    ["basket", "storage"],
  ),
  // Desk & Office
  nvidia(
    "stationery_pen_metal_a01",
    "Metal ballpoint pen",
    "Model of a metal ballpoint pen.",
    "Desk & Office",
    ["pen", "stationery"],
  ),
  nvidia(
    "stationery_marker_alcohol_box_a01",
    "Alcohol marker set",
    "Model of a boxed set of alcohol markers.",
    "Desk & Office",
    ["marker", "art supplies"],
  ),
  nvidia(
    "stationery_pencil_watercolor_azure_a01",
    "Watercolor pencil",
    "Model of an azure watercolor pencil.",
    "Desk & Office",
    ["pencil", "art supplies"],
  ),
  nvidia(
    "stationery_tacks_cork_a02",
    "Cork with push pins",
    "Model of a cork stopper holding push pins.",
    "Desk & Office",
    ["pins", "stationery"],
  ),
  nvidia(
    "misc_tape_dispenser_a01",
    "Tape dispenser",
    "Model of a desktop tape dispenser.",
    "Desk & Office",
    ["tape", "stationery"],
  ),
  nvidia(
    "misc_notebook_a01",
    "Notebook",
    "Model of a notebook.",
    "Desk & Office",
    ["notebook", "stationery"],
  ),
  nvidia(
    "lighting_taskLight_adjustableArmBench_a01",
    "Adjustable arm desk lamp",
    "Model of a bench lamp with an adjustable arm.",
    "Desk & Office",
    ["lamp", "lighting"],
  ),
  // Auto Parts
  nvidia(
    "engineComponent_cylinder_piston_a01",
    "Engine piston",
    "Model of an engine piston with connecting rod.",
    "Auto Parts",
    ["engine"],
  ),
  nvidia(
    "engineComponent_crankshaft_b01",
    "Crankshaft",
    "Model of an engine crankshaft.",
    "Auto Parts",
    ["engine"],
  ),
  nvidia(
    "engineComponent_turbocompressor_a01",
    "Turbocharger",
    "Model of a turbocharger.",
    "Auto Parts",
    ["engine", "turbo"],
  ),
  nvidia(
    "engineComponent_spark_plug_b01",
    "Spark plug",
    "Model of a spark plug.",
    "Auto Parts",
    ["engine", "ignition"],
  ),
  nvidia(
    "engineComponent_flywheel_a01",
    "Flywheel",
    "Model of an engine flywheel.",
    "Auto Parts",
    ["engine", "drivetrain"],
  ),
  nvidia(
    "drivetrain_differential_a01",
    "Differential",
    "Model of a differential.",
    "Auto Parts",
    ["drivetrain"],
  ),
  nvidia(
    "drivetrain_transmission_manual_a01",
    "Manual transmission",
    "Model of a manual transmission.",
    "Auto Parts",
    ["drivetrain"],
  ),
  nvidia(
    "suspension_shock_absorber_a01",
    "Shock absorber",
    "Model of a shock absorber.",
    "Auto Parts",
    ["suspension"],
  ),
  nvidia(
    "suspension_strut_assembly_a01",
    "Strut assembly",
    "Model of a suspension strut assembly.",
    "Auto Parts",
    ["suspension"],
  ),
  // Safety Gear
  nvidia(
    "ppe_helmet_hardHat_a01",
    "Hard hat",
    "Model of a safety hard hat.",
    "Safety Gear",
    ["ppe", "helmet"],
  ),
  nvidia(
    "ppe_eyeProtection_goggles_a01",
    "Safety goggles",
    "Model of a pair of safety goggles.",
    "Safety Gear",
    ["ppe", "eye protection"],
  ),
  nvidia(
    "ppe_hearingProtection_earMuffs_a01",
    "Ear muffs",
    "Model of hearing protection ear muffs.",
    "Safety Gear",
    ["ppe", "hearing protection"],
  ),
  nvidia(
    "ppe_faceProtection_faceShield_a01",
    "Face shield",
    "Model of a protective face shield.",
    "Safety Gear",
    ["ppe", "face protection"],
  ),
  nvidia(
    "ppe_respirator_halfMask_a01",
    "Half mask respirator",
    "Model of a half mask respirator.",
    "Safety Gear",
    ["ppe", "respirator"],
  ),
  // Games & Toys
  nvidia(
    "misc_toy_pongPaddle_bat_a01",
    "Table tennis paddle",
    "Model of a table tennis paddle.",
    "Games & Toys",
    ["sports", "table tennis"],
  ),
  nvidia(
    "misc_golfBall_a01",
    "Golf ball",
    "Model of a golf ball.",
    "Games & Toys",
    ["sports", "golf"],
  ),
  nvidia(
    "toy_marble_a01",
    "Glass marble",
    "Model of a glass marble.",
    "Games & Toys",
    ["toy", "marble"],
  ),
];

/** Base price for a demo print, by category, in USD */
export const basePrice: Record<Category, number> = {
  Tools: 18,
  "Kitchen & Home": 14,
  "Desk & Office": 9,
  "Auto Parts": 32,
  "Safety Gear": 16,
  "Games & Toys": 6,
  "Maker Electronics": 12,
  "Sculpture & Design": 34,
  Fossils: 29,
  "Shells & Corals": 22,
  History: 26,
  "Air & Space": 39,
};
