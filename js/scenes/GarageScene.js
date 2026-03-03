class GarageScene extends Phaser.Scene {
    constructor() {
        super('GarageScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x0e0e12, 0x0e0e12, 0x1a1a2e, 0x1a1a2e, 1);
        graphics.fillRect(0, 0, width, height);

        // Title
        this.add.text(width / 2, 80, 'GARAGE', {
            fontFamily: 'Outfit', fontSize: '56px', fontWeight: '900', color: '#ffffff'
        }).setOrigin(0.5);

        this.updateUI();

        // Back Button
        this.createButton(width / 2, height - 100, 'BACK TO MENU', () => {
            this.scene.start('MenuScene');
        });
    }

    updateUI() {
        if (this.uiGroup) this.uiGroup.destroy(true);
        this.uiGroup = this.add.group();

        const { width, height } = this.scale;
        const stats = SaveManager.load();

        // Coins Bar
        const coinCard = this.add.container(width / 2, 160);
        const cardBg = this.add.rectangle(0, 0, 400, 60, 0x00ffa3, 0.05).setStrokeStyle(1.5, 0x00ffa3);
        const coinText = this.add.text(0, 0, `BALANCE: $${stats.coins}`, {
            fontFamily: 'Outfit', fontSize: '32px', fontWeight: 'bold', color: '#00ffa3'
        }).setOrigin(0.5);
        coinCard.add([cardBg, coinText]);
        this.uiGroup.add(coinCard);

        // Engine Upgrade
        const engineCost = stats.engineLevel * 1200;
        this.createUpgradeRow(width / 2, 320, 'MOTOR (Max Speed)', stats.engineLevel, engineCost, () => {
            const res = SaveManager.upgradeEngine();
            if (res.success) this.updateUI();
            else this.flashError();
        });

        // Acceleration Upgrade
        const accelCost = stats.accelerationLevel * 1200;
        this.createUpgradeRow(width / 2, 440, 'ACELERAÇÃO (Start Speed)', stats.accelerationLevel, accelCost, () => {
            const res = SaveManager.upgradeAcceleration();
            if (res.success) this.updateUI();
            else this.flashError();
        });
    }

    createUpgradeRow(x, y, label, level, cost, callback) {
        const row = this.add.container(x, y);

        const labelText = this.add.text(-280, 0, `${label} - LVL ${level}`, {
            fontFamily: 'Outfit', fontSize: '26px', color: '#ffffff'
        }).setOrigin(0, 0.5);

        const btnBg = this.add.rectangle(200, 0, 240, 60, 0x00a3ff, 0.1)
            .setStrokeStyle(2, 0x00a3ff)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callback);

        const btnText = this.add.text(200, 0, `BUY $${cost}`, {
            fontFamily: 'Outfit', fontSize: '22px', fontWeight: 'bold', color: '#00a3ff'
        }).setOrigin(0.5);

        row.add([labelText, btnBg, btnText]);
        this.uiGroup.add(row);
    }

    createButton(x, y, label, callback) {
        const bg = this.add.rectangle(x, y, 300, 55, 0xffffff, 0.05)
            .setStrokeStyle(1, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callback);

        const txt = this.add.text(x, y, label, {
            fontFamily: 'Outfit', fontSize: '22px', color: '#ffffff'
        }).setOrigin(0.5);
    }

    flashError() {
        this.cameras.main.shake(200, 0.005);
    }
}
