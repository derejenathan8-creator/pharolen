export class Inventory {
  constructor() {
    this.weapons = ['sword', 'spear', 'mace'];
    this.equipped = 'sword';
  }

  equip(name) {
    if (!this.weapons.includes(name)) return false;
    this.equipped = name;
    return true;
  }

  getEquipped() {
    return this.equipped;
  }

  all() {
    return [...this.weapons];
  }
}
