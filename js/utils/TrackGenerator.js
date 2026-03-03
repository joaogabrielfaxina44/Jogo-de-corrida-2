class TrackGenerator {
    /**
     * @param {number} width 
     * @param {number} height 
     * @param {number} segments 
     */
    static generate(width, height, segments = 14) {
        const points = [];
        const centerX = width / 2;
        const centerY = height / 2;
        const minRadius = Math.min(width, height) * 0.25;
        const maxRadius = Math.min(width, height) * 0.40;

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const variance = Math.random() * (maxRadius - minRadius);
            const radius = minRadius + variance;

            points.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            });
        }

        // Add some noise to points
        return this.smoothPoints(points);
    }

    /**
     * Use Cubic Hermite Spline for ultra-smooth loops
     */
    static smoothPoints(points, detail = 12) {
        const smooth = [];
        const n = points.length;

        for (let i = 0; i < n; i++) {
            const p0 = points[(i - 1 + n) % n];
            const p1 = points[i];
            const p2 = points[(i + 1) % n];
            const p3 = points[(i + 2) % n];

            for (let t = 0; t < 1; t += 1 / detail) {
                smooth.push(this.interpolate(p0, p1, p2, p3, t));
            }
        }
        return smooth;
    }

    static interpolate(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        const tension = 0.5;

        const f1 = -tension * t3 + 2 * tension * t2 - tension * t;
        const f2 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
        const f3 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t;
        const f4 = tension * t3 - tension * t2;

        return {
            x: p0.x * f1 + p1.x * f2 + p2.x * f3 + p3.x * f4,
            y: p0.y * f1 + p1.y * f2 + p2.y * f3 + p3.y * f4
        };
    }
}
