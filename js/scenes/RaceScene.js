/**
 * @file RaceScene.js
 * @description Lógica meticulosa de corrida com física de precisão.
 */
class RaceScene extends Phaser.Scene {
    constructor() {
        super('RaceScene');
    }

    init() {
        this.trackPoints = [];
        this.player = null;
        this.opponents = [];
        this.isRacing = false;
        this.currentLap = 1;
        this.maxLaps = 5;
        this.trackWidth = 400; // Pista extra larga conforme solicitado
        this.worldSize = 4000;
        this.stats = SaveManager.load();
    }

    preload() {
        // Carregamento de Assets
        const path = './assets/';
        this.load.image('player_car', path + 'car_player.png');
        this.load.image('enemy_car', path + 'car_enemy.png');
        this.load.image('item_box', path + 'item_box.png');
        this.load.image('oil_spill', path + 'oil.png');
    }

    create() {
        // 1. Geração de Pista Meticulosa
        this.trackPoints = TrackGenerator.generate(this.worldSize, this.worldSize, 14);

        // 2. Física e Barreiras
        this.physics.world.setBounds(0, 0, this.worldSize, this.worldSize);
        this.barriers = this.physics.add.staticGroup();
        this.renderTrackAndCreateCollisions();

        // 3. Criação do Jogador (Posicionado no início da pista)
        const start = this.trackPoints[0];
        this.player = this.spawnCar(start.x, start.y, 'player_car', true);

        // 4. Criação de Rivais (IA)
        for (let i = 0; i < 3; i++) {
            const opp = this.spawnCar(start.x + (i + 1) * 60, start.y + 40, 'enemy_car', false);
            this.opponents.push(opp);
        }

        // 5. Configuração da Câmera (Foco Prioritário no Jogador)
        this.cameras.main.setBounds(0, 0, this.worldSize, this.worldSize);
        this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
        this.cameras.main.setZoom(1);

        // 6. Configuração de Colisões
        this.physics.add.collider(this.player, this.barriers);
        this.opponents.forEach(o => {
            this.physics.add.collider(o, this.barriers);
            this.physics.add.collider(this.player, o);
        });

        // 7. HUD e Inicialização
        this.createHUD();
        this.spawnItems();
        this.startCountdown();
    }

    spawnCar(x, y, key, isPlayer) {
        const car = this.physics.add.sprite(x, y, key);

        // Validação de Textura (Fallback de Segurança)
        if (!this.textures.exists(key) || this.textures.get(key).key === '__MISSING') {
            const tempKey = key + '_fb';
            if (!this.textures.exists(tempKey)) {
                this.add.rectangle(0, 0, 40, 60, isPlayer ? 0x00a3ff : 0xff3333).generateTexture(tempKey, 40, 60);
            }
            car.setTexture(tempKey);
        }

        car.setCollideWorldBounds(true);
        car.setDrag(0.96);
        car.depth = 10;

        // CORREÇÃO DE HITBOX: Ajuste para precisão milimétrica
        car.body.setSize(30, 48);

        car.stats = {
            speed: 0,
            maxSpeed: isPlayer ? (460 + (this.stats.engine - 1) * 30) : (400 + Math.random() * 50),
            accel: isPlayer ? (14 + (this.stats.accel - 1) * 2) : (10 + Math.random() * 3),
            lap: 1,
            checkpoint: 0,
            isStunned: false
        };

        return car;
    }

    renderTrackAndCreateCollisions() {
        const g = this.add.graphics();

        // Visual da Pista (Asfalto e Grama)
        g.lineStyle(this.trackWidth + 80, 0x1a4d1a, 1); // Bordas Verdes
        g.beginPath();
        g.moveTo(this.trackPoints[0].x, this.trackPoints[0].y);
        this.trackPoints.forEach(p => g.lineTo(p.x, p.y));
        g.closePath();
        g.strokePath();

        g.lineStyle(this.trackWidth, 0x2e2e2e, 1); // Asfalto Cinza
        g.strokePath();

        // Linha de Chegada
        const p1 = this.trackPoints[0];
        const p2 = this.trackPoints[1];
        const angle = Phaser.Math.Angle.Between(p1.x, p1.y, p2.x, p2.y);
        this.add.rectangle(p1.x, p1.y, this.trackWidth, 20, 0xff0000).setRotation(angle + Math.PI / 2).setDepth(2);

        // CORREÇÃO DE HITBOX DA PISTA: Meticulosa cadeia de esferas de colisão
        const halfWidth = this.trackWidth / 2 + 10;
        const spacing = 45;

        for (let i = 0; i < this.trackPoints.length; i++) {
            const start = this.trackPoints[i];
            const end = this.trackPoints[(i + 1) % this.trackPoints.length];
            const dist = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
            const ang = Phaser.Math.Angle.Between(start.x, start.y, end.x, end.y);
            const normal = ang + Math.PI / 2;

            for (let d = 0; d < dist; d += spacing) {
                const px = start.x + Math.cos(ang) * d;
                const py = start.y + Math.sin(ang) * d;
                this.addBarrierCircle(px + Math.cos(normal) * halfWidth, py + Math.sin(normal) * halfWidth);
                this.addBarrierCircle(px - Math.cos(normal) * halfWidth, py - Math.sin(normal) * halfWidth);
            }
        }
    }

    addBarrierCircle(x, y) {
        const c = this.add.circle(x, y, 25, 0x000, 0);
        this.physics.add.existing(c, true);
        this.barriers.add(c);
        c.body.setCircle(25);
    }

    update() {
        if (!this.player || !this.isRacing) return;

        this.handlePlayerInput();
        this.handleAI();
        this.updateProgress();
        this.updateHUDText();
    }

    handlePlayerInput() {
        if (this.player.stats.isStunned) return;

        const k = this.input.keyboard.createCursorKeys();
        let mx = 0, my = 0;

        if (k.left.isDown) mx = -1;
        else if (k.right.isDown) mx = 1;
        if (k.up.isDown) my = -1;
        else if (k.down.isDown) my = 1;

        if (mx !== 0 || my !== 0) {
            // Movimentação Onidirecional com Rotação Fluida
            const targetAng = Math.atan2(my, mx);
            this.player.rotation = Phaser.Math.Angle.RotateTo(this.player.rotation, targetAng, 0.16);
            this.player.stats.speed = Math.min(this.player.stats.speed + this.player.stats.accel, this.player.stats.maxSpeed);
        } else {
            this.player.stats.speed *= 0.97;
        }

        this.player.setVelocity(Math.cos(this.player.rotation) * this.player.stats.speed, Math.sin(this.player.rotation) * this.player.stats.speed);
    }

    handleAI() {
        this.opponents.forEach(o => {
            if (o.stats.isStunned) return;
            const targetIdx = (o.stats.checkpoint + 1) % this.trackPoints.length;
            const target = this.trackPoints[targetIdx];
            const ang = Phaser.Math.Angle.Between(o.x, o.y, target.x, target.y);

            o.rotation = Phaser.Math.Angle.RotateTo(o.rotation, ang, 0.08);
            o.stats.speed = Math.min(o.stats.speed + o.stats.accel, o.stats.maxSpeed * 0.9);
            o.setVelocity(Math.cos(o.rotation) * o.stats.speed, Math.sin(o.rotation) * o.stats.speed);
        });
    }

    updateProgress() {
        const team = [this.player, ...this.opponents];
        team.forEach(c => {
            const next = (c.stats.checkpoint + 1) % this.trackPoints.length;
            if (Phaser.Math.Distance.Between(c.x, c.y, this.trackPoints[next].x, this.trackPoints[next].y) < 300) {
                c.stats.checkpoint = next;
                if (next === 0) {
                    c.stats.lap++;
                    if (c === this.player && c.stats.lap > this.maxLaps) this.endRace();
                }
            }
        });
    }

    spawnItems() {
        for (let i = 0; i < 20; i++) {
            const p = this.trackPoints[Phaser.Math.Between(0, this.trackPoints.length - 1)];
            const item = this.physics.add.sprite(p.x + Phaser.Math.Between(-150, 150), p.y + Phaser.Math.Between(-150, 150), 'item_box');
            this.physics.add.overlap(this.player, item, () => {
                item.destroy();
                this.applyEffect(Phaser.Utils.Array.GetRandom(['turbo', 'oil', 'projectile']));
            });
        }
    }

    applyEffect(type) {
        if (type === 'turbo') {
            const base = this.player.stats.maxSpeed;
            this.player.stats.maxSpeed *= 1.7;
            this.player.setTint(0x00ffff);
            this.time.delayedCall(3000, () => { this.player.stats.maxSpeed = base; this.player.clearTint(); });
        } else if (type === 'oil') {
            const oil = this.physics.add.sprite(this.player.x, this.player.y, 'oil_spill');
            this.opponents.forEach(o => this.physics.add.overlap(o, oil, () => { this.stunVehicle(o); oil.destroy(); }));
        } else if (type === 'projectile') {
            const p = this.physics.add.sprite(this.player.x, this.player.y, 'item_box').setTint(0xff0000);
            p.setVelocity(Math.cos(this.player.rotation) * 1100, Math.sin(this.player.rotation) * 1100);
            this.opponents.forEach(o => this.physics.add.overlap(o, p, () => { this.stunVehicle(o); p.destroy(); }));
            this.time.delayedCall(2000, () => p.destroy());
        }
    }

    stunVehicle(c) {
        if (c.stats.isStunned) return;
        c.stats.isStunned = true;
        c.setTint(0xff0000); c.setVelocity(0, 0);
        this.time.delayedCall(1600, () => { c.stats.isStunned = false; c.clearTint(); });
    }

    createHUD() {
        this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(100);
        const style = { fontSize: '32px', fontWeight: 'bold', color: '#fff', stroke: '#000', strokeThickness: 5 };
        this.lapTxt = this.add.text(40, 40, 'LAP: 1/5', style);
        this.speedTxt = this.add.text(40, 85, 'SPEED: 0', { ...style, color: '#00ffa3' });
        this.hud.add([this.lapTxt, this.speedTxt]);
    }

    updateHUDText() {
        this.lapTxt.setText(`LAP: ${Math.min(this.player.stats.lap, this.maxLaps)}/${this.maxLaps}`);
        this.speedTxt.setText(`SPEED: ${Math.floor(this.player.stats.speed)}`);
    }

    startCountdown() {
        let val = 3;
        const txt = this.add.text(640, 360, '3', { fontSize: '180px', fontWeight: '900', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
        this.time.addEvent({
            delay: 1000, repeat: 3, callback: () => {
                if (val === 0) { txt.setText('GO!'); this.isRacing = true; this.time.delayedCall(1000, () => txt.destroy()); }
                else if (val > 0) txt.setText(val);
                val--;
            }
        });
    }

    endRace() {
        this.isRacing = false;
        this.add.text(640, 360, 'FINISH!', { fontSize: '120px', backgroundColor: '#000', padding: 20 }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
        SaveManager.addCoins(750);
        this.time.delayedCall(3000, () => this.scene.start('MenuScene'));
    }
}
