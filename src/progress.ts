import { Router, Request, Response } from 'express';
import { MongoStore } from './mongo';
import { Day } from './types/collections.js';

export function makeProgressRouter(mongo: MongoStore): Router {
    const router = Router();

// GET /api/progress/:yyyymm - Get progress data for a specific month
router.get('/:yyyymm', async (req, res) => {
    try {
        const yyyymm = req.params.yyyymm;
        
        // Validate format
        if (!/^\d{6}$/.test(yyyymm)) {
            return res.status(400).json({ error: 'Invalid month format. Expected YYYYMM.' });
        }

        const year = parseInt(yyyymm.substring(0, 4));
        const month = parseInt(yyyymm.substring(4, 6));

        // Validate month
        if (month < 1 || month > 12) {
            return res.status(400).json({ error: 'Invalid month. Must be between 01 and 12.' });
        }

        // Get all days for the specified month
        const startDate = year * 10000 + month * 100 + 1; // YYYYMM01
        const endDate = year * 10000 + month * 100 + 31; // YYYYMM31 (we'll filter exact dates)
        
        const days = await mongo.days.find({
            yyyymmdd: { $gte: startDate, $lte: endDate }
        }).toArray() as Day[];

        // Get actual days in the month
        const daysInMonth = new Date(year, month, 0).getDate();
        const progressData: any[] = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = year * 10000 + month * 100 + day;
            const dayData = days.find((d: Day) => d.yyyymmdd === dayDate);
            
            if (dayData && dayData.meals && dayData.meals.length > 0) {
                // Calculate total calories consumed
                const totalConsumed = dayData.meals.reduce((total: number, meal: any) => {
                    if (meal.foods && meal.foods.length > 0) {
                        return total + meal.foods.reduce((mealTotal: number, food: any) => mealTotal + food.kcal, 0);
                    }
                    return total;
                }, 0);

                // Only include days where food was actually consumed
                if (totalConsumed > 0) {
                    // Get goal from day or use default
                    const goalKcal = dayData.goal_kcal || 2000;
                    
                    // Calculate deficit (positive = deficit, negative = surplus)
                    const deficit = goalKcal - totalConsumed;
                    
                    progressData.push({
                        date: formatDateForChart(year, month, day),
                        consumed: totalConsumed,
                        goal: goalKcal,
                        deficit: deficit
                    });
                }
            }
        }

        // Calculate month statistics
        const monthStats = calculateMonthStats(progressData);

        res.json({
            days: progressData,
            monthStats: monthStats
        });

    } catch (error) {
        console.error('Error fetching progress data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function formatDateForChart(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function calculateMonthStats(days: any[]) {
    if (days.length === 0) {
        return {
            daysWithData: 0,
            deficitDays: 0,
            surplusDays: 0,
            totalDeficit: 0,
            avgDailyDeficit: 0,
            projectedWeightChange: 0
        };
    }

    const totalDeficit = days.reduce((sum, day) => sum + day.deficit, 0);
    const deficitDays = days.filter(day => day.deficit > 0).length;
    const surplusDays = days.filter(day => day.deficit < 0).length;
    const avgDailyDeficit = Math.round(totalDeficit / days.length);
    
    // Estimate weight change (3500 calories = 1 pound)
    const projectedWeightChange = totalDeficit / 3500;

    return {
        daysWithData: days.length,
        deficitDays,
        surplusDays,
        totalDeficit: Math.round(totalDeficit),
        avgDailyDeficit,
        projectedWeightChange: Math.round(projectedWeightChange * 10) / 10 // Round to 1 decimal
    };
}

    return router;
}
