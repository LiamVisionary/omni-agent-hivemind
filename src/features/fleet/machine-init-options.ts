export const HETZNER_SERVER_TYPE_OPTIONS = [
  { value: "cx23", label: "CX23", detail: "x86 shared CPU · small general node", monthlyEur: 3.99, cores: 2, memoryGb: 4, diskGb: 40, cpu: "Intel/AMD shared" },
  { value: "cx33", label: "CX33", detail: "x86 shared CPU · medium general node", monthlyEur: 6.99, cores: 4, memoryGb: 8, diskGb: 80, cpu: "Intel/AMD shared" },
  { value: "cx43", label: "CX43", detail: "x86 shared CPU · larger general node", monthlyEur: 13.99, cores: 8, memoryGb: 16, diskGb: 160, cpu: "Intel/AMD shared" },
  { value: "cx53", label: "CX53", detail: "x86 shared CPU · high-memory general node", monthlyEur: 27.99, cores: 16, memoryGb: 32, diskGb: 320, cpu: "Intel/AMD shared" },
  { value: "cax11", label: "CAX11", detail: "ARM shared CPU · low-cost node", monthlyEur: 4.49, cores: 2, memoryGb: 4, diskGb: 40, cpu: "Ampere ARM shared" },
  { value: "cax21", label: "CAX21", detail: "ARM shared CPU · medium node", monthlyEur: 8.99, cores: 4, memoryGb: 8, diskGb: 80, cpu: "Ampere ARM shared" },
  { value: "cax31", label: "CAX31", detail: "ARM shared CPU · larger node", monthlyEur: 16.99, cores: 8, memoryGb: 16, diskGb: 160, cpu: "Ampere ARM shared" },
  { value: "cax41", label: "CAX41", detail: "ARM shared CPU · high-memory node", monthlyEur: 31.49, cores: 16, memoryGb: 32, diskGb: 320, cpu: "Ampere ARM shared" },
  { value: "cpx11", label: "CPX11", detail: "AMD shared CPU · compact node", monthlyEur: 5.99, cores: 2, memoryGb: 2, diskGb: 40, cpu: "AMD shared" },
  { value: "cpx21", label: "CPX21", detail: "AMD shared CPU · small node", monthlyEur: 11.99, cores: 3, memoryGb: 4, diskGb: 80, cpu: "AMD shared" },
  { value: "cpx31", label: "CPX31", detail: "AMD shared CPU · medium node", monthlyEur: 20.99, cores: 4, memoryGb: 8, diskGb: 160, cpu: "AMD shared" },
  { value: "cpx41", label: "CPX41", detail: "AMD shared CPU · larger node", monthlyEur: 38.99, cores: 8, memoryGb: 16, diskGb: 240, cpu: "AMD shared" },
  { value: "cpx51", label: "CPX51", detail: "AMD shared CPU · high-memory node", monthlyEur: 77.99, cores: 16, memoryGb: 32, diskGb: 360, cpu: "AMD shared" },
  { value: "ccx13", label: "CCX13", detail: "AMD dedicated CPU · small worker", monthlyEur: 16.99, cores: 2, memoryGb: 8, diskGb: 80, cpu: "AMD dedicated" },
  { value: "ccx23", label: "CCX23", detail: "AMD dedicated CPU · medium worker", monthlyEur: 33.99, cores: 4, memoryGb: 16, diskGb: 160, cpu: "AMD dedicated" },
  { value: "ccx33", label: "CCX33", detail: "AMD dedicated CPU · large worker", monthlyEur: 64.99, cores: 8, memoryGb: 32, diskGb: 240, cpu: "AMD dedicated" },
  { value: "ccx43", label: "CCX43", detail: "AMD dedicated CPU · larger worker", monthlyEur: 129.99, cores: 16, memoryGb: 64, diskGb: 360, cpu: "AMD dedicated" },
  { value: "ccx53", label: "CCX53", detail: "AMD dedicated CPU · high-memory worker", monthlyEur: 259.99, cores: 32, memoryGb: 128, diskGb: 600, cpu: "AMD dedicated" },
  { value: "ccx63", label: "CCX63", detail: "AMD dedicated CPU · heavy worker", monthlyEur: 389.99, cores: 48, memoryGb: 192, diskGb: 960, cpu: "AMD dedicated" },
] as const;

export const HETZNER_LOCATION_OPTIONS = [
  { value: "fsn1", label: "Falkenstein, Germany (fsn1)" },
  { value: "nbg1", label: "Nuremberg, Germany (nbg1)" },
  { value: "hel1", label: "Helsinki, Finland (hel1)" },
  { value: "ash", label: "Ashburn, Virginia, US (ash)" },
  { value: "hil", label: "Hillsboro, Oregon, US (hil)" },
  { value: "sin", label: "Singapore (sin)" },
] as const;

export const HETZNER_IMAGE_OPTIONS = [
  { value: "ubuntu-24.04", label: "Ubuntu 24.04 LTS" },
  { value: "ubuntu-22.04", label: "Ubuntu 22.04 LTS" },
  { value: "debian-13", label: "Debian 13" },
  { value: "debian-12", label: "Debian 12" },
] as const;
