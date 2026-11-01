const m = new Map();
module.exports = { get: (t) => !!m.get(String(t)), set: (t, v) => m.set(String(t), !!v) };
