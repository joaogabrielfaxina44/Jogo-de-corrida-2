class SaveManager {
    static STORAGE_KEY = 'turbo_sprint_new_save';

    static load() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Corrupted save data, resetting.", e);
            }
        }
        return {
            coins: 0,
            engineLevel: 1,
            accelerationLevel: 1,
            unlockedCars: ['player_car']
        };
    }

    static save(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        window.gameStats = data;
    }

    static addCoins(amount) {
        const stats = this.load();
        stats.coins += Math.max(0, amount);
        this.save(stats);
    }

    static upgradeEngine() {
        const stats = this.load();
        const cost = stats.engineLevel * 1200; // Meticulous pricing
        if (stats.coins >= cost) {
            stats.coins -= cost;
            stats.engineLevel++;
            this.save(stats);
            return { success: true, newLevel: stats.engineLevel, remainingCoins: stats.coins };
        }
        return { success: false, reason: 'NOT_ENOUGH_COINS' };
    }

    static upgradeAcceleration() {
        const stats = this.load();
        const cost = stats.accelerationLevel * 1200;
        if (stats.coins >= cost) {
            stats.coins -= cost;
            stats.accelerationLevel++;
            this.save(stats);
            return { success: true, newLevel: stats.accelerationLevel, remainingCoins: stats.coins };
        }
        return { success: false, reason: 'NOT_ENOUGH_COINS' };
    }
}
