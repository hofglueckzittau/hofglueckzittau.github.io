// Everything the farm must confirm before go-live lives in this file.
export const site = {
  name: 'Hofglück Zittau',
  url: 'https://buigiaanfb1.github.io/hofglueck-zittau', // TODO: real domain once there is one
  street: 'Lückendorfer Straße 16',
  zip: '02763',
  city: 'Zittau',
  phone: '+49 123408899',
  email: 'hofglueckzittau@gmail.com',
  owner: '[Name des Betreibers]', // TODO
  geo: { lat: 50.867849, lng: 14.806608 },
  plusCode: 'VR94+4JQ Zittau',
  hours: { open: '09:00', close: '17:00', closedWeekday: 1 }, // closedWeekday: 0=Sun, 1=Mon
  slots: { am: '09:00–12:00', pm: '13:00–17:00' },
};

// confirmed:false prices are not in the brief. They are placeholders and show an asterisk on the site.
export const pricing = {
  fuehrung: { confirmed: true, units: { adult: 8, child: 5 } },
  fuettern: { confirmed: true, units: { portion: 3 } },
  foto: { confirmed: true, free: true, units: {} }, // free, no time limit, not in the booking flow
  eier: { confirmed: false, units: { person: 4 } },
  ernten: { confirmed: false, units: { person: 6 } },
  butter: { confirmed: false, units: { person: 12 } },
  garten: { confirmed: false, units: { person: 15 } },
  alpaka: { confirmed: false, units: { person: 18 } },
};

export const abo = {
  M: { pfand: 3, price: 14.9 }, // pfand confirmed; price is a placeholder
  L: { pfand: 5, price: 24.9 },
};
