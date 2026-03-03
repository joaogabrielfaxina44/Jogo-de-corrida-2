class RaceScene extends Phaser.Scene {
    constructor() {
        super('RaceScene');
    }

    init() {
        this.trackPoints = [];
        this.player = null;
        this.opponents = [];
        this.items = [];
        this.currentLap = 1;
        this.maxLaps = 5;
        this.isRacing = false;
        this.worldSize = 4500;
        this.trackWidth = 400; // Wide track as requested
        this.stats = SaveManager.load();
    }

    preload() {
        // High-Quality Assets Path
        this.load.image('player_car', './assets/car_player.png');
        this.load.image('enemy_car', './assets/car_enemy.png');
        this.load.image('item_box', './assets/item_box.png');
        this.load.image('oil_spill', './assets/oil.png');
    }

    create() {
        const { width, height } = this.scale;

        // 1. Procedural Track Generation
        this.trackPoints = TrackGenerator.generate(this.worldSize, this.worldSize, 16);

        // 2. Render Track Visuals
        this.renderTrackBackground();

        // 3. Physical Barrier Creation (Meticulous chain of circles for curves)
        this.barriers = this.physics.add.staticGroup();
        this.createPhysicalBarriers();

        // 4. World Physics Bounds
        this.physics.world.setBounds(0, 0, this.worldSize, this.worldSize);

        // 5. Create Vehicles
        this.player = this.createCar(this.trackPoints[0].x, this.trackPoints[0].y, 'player_car', true);

        for (let i = 0; i < 3; i++) {
            const opp = this.createCar(
                this.trackPoints[0].x + (i + 1) * 70,
                this.trackPoints[0].y + 50,
                'enemy_car',
                false
            );
            this.opponents.push(opp);
        }

        // 6. Camera Setup (Immediate Follow)
        this.cameras.main.setBounds(0, 0, this.worldSize, this.worldSize);
        this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
        this.cameras.main.centerOn(this.player.x, this.player.y);

        // 7. Collision Setup
        this.physics.add.collider(this.player, this.barriers);
        this.opponents.forEach(opp => {
            this.physics.add.collider(opp, this.barriers);
            this.physics.add.collider(this.player, opp);
        });

        // 8. HUD & UI
        this.createHUD();
        this.spawnItems();
        this.startCountdown();
    }

    createCar(x, y, key, isPlayer) {
        const car = this.physics.add.sprite(x, y, key);

        // Robust Fallback (If PNGs are missing from server)
        if (!this.textures.exists(key) || this.textures.get(key).key === '__MISSING') {
            const textureName = key + '_new_fallback';
            if (!this.textures.exists(textureName)) {
                const graphics = this.make.graphics();
                graphics.fillStyle(isPlayer ? 0x00a3ff : 0xff3838, 1);
                graphics.fillRect(0, 0, 40, 60);
                graphics.generateTexture(textureName, 40, 60);
            }
            car.setTexture(textureName);
        }

        car.setCollideWorldBounds(true);
        car.setDrag(0.96);
        car.setAngularDrag(0.9);
        car.depth = 12;

        // Custom Hitbox (Refined for better experience)
        car.body.setSize(32, 48);

        car.stats = {
            velocity: 0,
            maxSpeed: (isPlayer ? 500 * (1 + (this.stats.engineLevel - 1) * 0.05) : 400 + Math.random() * 80),
            accelRate: (isPlayer ? 15 * (1 + (this.stats.accelerationLevel - 1) * 0.1) : 10 + Math.random() * 5),
            lap: 1,
            checkpointIdx: 0,
            isStunned: false
        };

        return car;
    }

    renderTrackBackground() {
        const g = this.add.graphics();

        // Dark Outer Grass
        g.lineStyle(this.trackWidth + 60, 0x144014, 1);
        g.beginPath();
        g.moveTo(this.trackPoints[0].x, this.trackPoints[0].y);
        this.trackPoints.forEach(p => g.lineTo(p.x, p.y));
        g.closePath();
        g.strokePath();

        // Asphalt Main Track
        g.lineStyle(this.trackWidth, 0x222226, 1);
        g.strokePath();

        // Decorative Lines
        g.lineStyle(5, 0xffffff, 0.08);
        g.strokePath();

        // Finish Line Visual
        const start = this.trackPoints[0];
        const next = this.trackPoints[1];
        const angle = Phaser.Math.Angle.Between(start.x, start.y, next.x, next.y);
        this.add.rectangle(start.x, start.y, this.trackWidth, 25, 0xff0000)
            .setRotation(angle + Math.PI / 2)
            .setDepth(1);
    }

    createPhysicalBarriers() {
        const halfWidth = this.trackWidth / 2 + 10;
        const segmentDensity = 35; // Pixels between collision circles

        for (let i = 0; i < this.trackPoints.length; i++) {
            const p1 = this.trackPoints[i];
            const p2 = this.trackPoints[(i + 1) % this.trackPoints.length];
            const angle = Phaser.Math.Angle.Between(p1.x, p1.y, p2.x, p2.y);
            const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
            const normal = angle + Math.PI / 2;

            for (let d = 0; d < dist; d += segmentDensity) {
                const bx = p1.x + Math.cos(angle) * d;
                const by = p1.y + Math.sin(angle) * d;

                // Edge Walls
                this.addStaticWall(bx + Math.cos(normal) * halfWidth, by + Math.sin(normal) * halfWidth);
                this.addStaticWall(bx - Math.cos(normal) * halfWidth, by - Math.sin(normal) * halfWidth);
            }
        }
    }

    addStaticWall(x, y) {
        const circle = this.add.circle(x, y, 22, 0x00ff00, 0); // Invisible
        this.physics.add.existing(circle, true);
        this.barriers.add(circle);
        circle.body.setCircle(22);
    }

    update() {
        if (!this.player) return;

        // Camera must follow even during countdown
        if (this.isRacing) {
            this.handlePlayerControl();
            this.handleAI();
            this.checkLapProgress();
            this.updateHUDText();
        }
    }

    handlePlayerControl() {
        if (this.player.stats.isStunned) return;

        const cursors = this.input.keyboard.createCursorKeys();
        let moveX = 0, moveY = 0;

        if (cursors.left.isDown) moveX = -1;
        else if (cursors.right.isDown) moveX = 1;
        if (cursors.up.isDown) moveY = -1;
        else if (cursors.down.isDown) moveY = 1;

        if (moveX !== 0 || moveY !== 0) {
            // Omnidirectional Rotation Logic
            const targetRotation = Math.atan2(moveY, moveX);
            this.player.rotation = Phaser.Math.Angle.RotateTo(this.player.rotation, targetRotation, 0.16);

            // Acceleration
            this.player.stats.velocity = Math.min(
                this.player.stats.velocity + this.player.stats.accelRate,
                this.player.stats.maxSpeed
            );
        } else {
            // Friction/Drag
            this.player.stats.velocity *= 0.96;
        }

        this.player.setVelocity(
            Math.cos(this.player.rotation) * this.player.stats.velocity,
            Math.sin(this.player.rotation) * this.player.stats.velocity
        );
    }

    handleAI() {
        this.opponents.forEach(opp => {
            if (opp.stats.isStunned) return;

            const nextIdx = (opp.stats.checkpointIdx + 1) % this.trackPoints.length;
            const target = this.trackPoints[nextIdx];
            const angleToTarget = Phaser.Math.Angle.Between(opp.x, opp.y, target.x, target.y);

            opp.rotation = Phaser.Math.Angle.RotateTo(opp.rotation, angleToTarget, 0.08);
            opp.stats.velocity = Math.min(opp.stats.velocity + opp.stats.accelRate, opp.stats.maxSpeed * 0.88);

            opp.setVelocity(
                Math.cos(opp.rotation) * opp.stats.velocity,
                Math.sin(opp.rotation) * opp.stats.velocity
            );
        });
    }

    checkLapProgress() {
        [this.player, ...this.opponents].forEach(car => {
            const nextIdx = (car.stats.checkpointIdx + 1) % this.trackPoints.length;
            const target = this.trackPoints[nextIdx];

            if (Phaser.Math.Distance.Between(car.x, car.y, target.x, target.y) < 280) {
                car.stats.checkpointIdx = nextIdx;
                if (nextIdx === 0) {
                    car.stats.lap++;
                    if (car === this.player && car.stats.lap > this.maxLaps) this.finishRace();
                }
            }
        });
    }

    spawnItems() {
        for (let i = 0; i < 22; i++) {
            const p = this.trackPoints[Phaser.Math.Between(0, this.trackPoints.length - 1)];
            const item = this.physics.add.sprite(
                p.x + Phaser.Math.Between(-140, 140),
                p.y + Phaser.Math.Between(-140, 140),
                'item_box'
            );

            this.physics.add.overlap(this.player, item, () => {
                item.destroy();
                this.applyPowerUp(Phaser.Utils.Array.GetRandom(['turbo', 'oil', 'projectile']));
            });
        }
    }

    applyPowerUp(type) {
        if (type === 'turbo') {
            const originalMax = this.player.stats.maxSpeed;
            this.player.stats.maxSpeed *= 1.7;
            this.player.setTint(0x00ffff);
            this.time.delayedCall(3500, () => {
                this.player.stats.maxSpeed = originalMax;
                this.player.clearTint();
            });
        } else if (type === 'oil') {
            const oil = this.physics.add.sprite(this.player.x, this.player.y, 'oil_spill');
            this.opponents.forEach(o => this.physics.add.overlap(o, oil, () => {
                this.stunVehicle(o);
                oil.destroy();
            }));
        } else if (type === 'projectile') {
            const p = this.physics.add.sprite(this.player.x, this.player.y, 'item_box').setTint(0xff0000);
            p.setVelocity(Math.sin(this.player.rotation) * 1100, Math.sin(this.player.rotation) * 1100);
            this.opponents.forEach(o => this.physics.add.overlap(o, p, () => {
                this.stunVehicle(o);
                p.destroy();
            }));
            this.time.delayedCall(2000, () => p.destroy());
        }
    }

    stunVehicle(car) {
        if (car.stats.isStunned) return;
        car.stats.isStunned = true;
        car.setTint(0xff3838);
        car.setVelocity(0, 0);
        this.time.delayedCall(1500, () => {
            car.stats.isStunned = false;
            car.clearTint();
        });
    }

    createHUD() {
        this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(150);
        this.lapT = this.add.text(35, 35, 'LAP: 1/5', { fontSize: '34px', fontWeight: 'bold', color: '#fff', stroke: '#000', strokeThickness: 6 });
        this.speedT = this.add.text(35, 80, 'SPEED: 0', { fontSize: '24px', fontWeight: 'bold', color: '#00ffa3', stroke: '#000', strokeThickness: 4 });
        this.posT = this.add.text(35, 120, 'POS: 1/4', { fontSize: '24px', fontWeight: 'bold', color: '#ffea00', stroke: '#000', strokeThickness: 4 });
        this.hud.add([this.lapT, this.speedT, this.posT]);
    }

    updateHUDText() {
        this.lapT.setText(`LAP: ${Math.min(this.player.stats.lap, this.maxLaps)}/${this.maxLaps}`);
        this.speedT.setText(`SPEED: ${Math.floor(this.player.stats.velocity)}`);

        // Dynamic Leaderboard
        let pos = 1;
        const pScore = this.player.stats.lap * 1000 + this.player.stats.checkpointIdx;
        this.opponents.forEach(o => {
            const oScore = o.stats.lap * 1000 + o.stats.checkpointIdx;
            if (oScore > pScore) pos++;
        });
        this.posT.setText(`POS: ${pos}/4`);
    }

    startCountdown() {
        let val = 3;
        const t = this.add.text(640, 360, '3', { fontSize: '180px', fontWeight: '900', color: '#fff', stroke: '#000', strokeThickness: 20 })
            .setOrigin(0.5).setScrollFactor(0).setDepth(200);

        this.time.addEvent({
            delay: 1000,
            repeat: 3,
            callback: () => {
                if (val === 0) {
                    t.setText('GO!');
                    this.isRacing = true;
                    this.time.delayedCall(1000, () => t.destroy());
                } else if (val > 0) {
                    t.setText(val);
                }
                val--;
            }
        });
    }

    finishRace() {
        this.isRacing = false;
        this.add.text(640, 360, 'RACE FINISHED!', { fontSize: '100px', backgroundColor: '#000', padding: 25 })
            .setOrigin(0.5).setScrollFactor(0).setDepth(300);

        SaveManager.addCoins(1000); // Reward
        this.time.delayedCall(3500, () => this.scene.start('MenuScene'));
    }
}
