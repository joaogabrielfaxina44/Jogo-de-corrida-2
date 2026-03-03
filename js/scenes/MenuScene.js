class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background Gradient (Graphic)
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x0e0e12, 0x0e0e12, 0x1a1a2e, 0x1a1a2e, 1);
        graphics.fillRect(0, 0, width, height);

        // Grid Pattern for aesthetic
        graphics.lineStyle(1, 0xffffff, 0.03);
        for (let i = 0; i < width; i += 40) { graphics.lineBetween(i, 0, i, height); }
        for (let j = 0; j < height; j += 40) { graphics.lineBetween(0, j, width, j); }

        // Title
        const title = this.add.text(width / 2, height * 0.32, 'TURBO SPRINT 2', {
            fontFamily: 'Outfit',
            fontSize: '96px',
            fontWeight: '900',
            color: '#ffffff',
            stroke: '#00a3ff',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Slow pulse tween
        this.tweens.add({
            targets: title,
            scale: 1.05,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Buttons
        this.createButton(width / 2, height * 0.58, 'START COMPETITION', () => {
            this.scene.start('RaceScene');
        });

        this.createButton(width / 2, height * 0.72, 'GARAGE & UPGRADES', () => {
            this.scene.start('GarageScene');
        });

        // Coins Badge
        const stats = SaveManager.load();
        const coinBadge = this.add.container(width - 40, 40);
        const coinBg = this.add.graphics();
        coinBg.fillStyle(0x00ffa3, 0.1).fillRoundedRect(-180, -25, 180, 50, 10).lineStyle(1, 0x00ffa3, 0.5).strokeRoundedRect(-180, -25, 180, 50, 10);
        const coinText = this.add.text(-90, 0, `COINS: $${stats.coins}`, {
            fontFamily: 'Outfit', fontSize: '20px', fontWeight: 'bold', color: '#00ffa3'
        }).setOrigin(0.5);
        coinBadge.add([coinBg, coinText]);
    }

    createButton(x, y, label, callback) {
        const btn = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 360, 65, 0x00a3ff, 0.15)
            .setStrokeStyle(1.5, 0x00a3ff);

        const txt = this.add.text(0, 0, label, {
            fontFamily: 'Outfit', fontSize: '24px', fontWeight: 'bold', color: '#00a3ff'
        }).setOrigin(0.5);

        btn.add([bg, txt]);

        bg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                bg.setFillStyle(0x00a3ff, 0.4);
                txt.setColor('#ffffff');
                this.tweens.add({ targets: btn, scale: 1.05, duration: 100 });
            })
            .on('pointerout', () => {
                bg.setFillStyle(0x00a3ff, 0.15);
                txt.setColor('#00a3ff');
                this.tweens.add({ targets: btn, scale: 1, duration: 100 });
            })
            .on('pointerdown', callback);

        return btn;
    }
}
