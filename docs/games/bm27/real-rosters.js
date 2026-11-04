/*
  BM27 verified real-roster seed pack.
  Player names are factual public sports data verified from indexed 2025-26
  STLtoday / STLhighschoolSPORTS coverage. Skills/OVRs remain simulated by BM27.
  Coverage is intentionally marked partial when a complete roster could not be
  verified from accessible public pages; BM27 fills uncovered slots with generated players.
*/
window.BM27_REAL_ROSTERS = {
  season: '2025-2026',
  updatedAt: '2026-08-08',
  provider: 'STLtoday / STLhighschoolSPORTS public coverage',
  schools: {
    'webster groves': {
      coverage: 'partial',
      players: [
        {name:'Scottie Adkinson'},
        {name:'Bryce Millien'},
        {name:'Jayden Woods'},
        {name:'Jackson Tabash'},
        {name:'Peter Oliver'}
      ]
    },
    'de smet jesuit': {
      coverage: 'partial',
      players: [
        {name:'Jordan Boyd'},
        {name:'Braden Butler'},
        {name:'Will Foulk'},
        {name:'Christian Ronken'}
      ]
    },
    'marquette': {
      coverage: 'partial',
      players: [
        {name:'Andrew Oldham'}
      ]
    },
    'chaminade': {
      coverage: 'partial',
      players: [
        {name:'Jahadi White Jr.'}
      ]
    }
  }
};
