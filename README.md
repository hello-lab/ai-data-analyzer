# AI Data Analytics Dashboard

A comprehensive Next.js application that analyzes user data with advanced AI metrics and provides beautiful data visualizations.

## Features

### Analytics Engine
- **K-means Clustering**: Automatically segments users into 4 distinct behavioral clusters
- **Engagement Index**: Weighted scoring system based on activity metrics
- **Activity Consistency**: Measures user behavior stability over time
- **Outlier Detection**: Statistical analysis using z-scores to identify anomalous users
- **Personalized Recommendations**: AI-driven suggestions based on cluster analysis
- **Behavioral Similarity**: Finds nearest behavioral neighbors for each user
- **Team Analytics**: Comprehensive team-level performance metrics
- **Correlation Analysis**: Statistical relationships between different metrics

### Data Visualizations
- **Pie Chart**: User cluster distribution
- **Bar Chart**: Team performance comparison with multiple metrics
- **Scatter Plot**: Balance vs Steps correlation analysis
- **Engagement Leaders**: Top performers visualization
- **Summary Tables**: Top engagement and consistency users
- **Cluster Analysis**: Detailed breakdown of each user segment
- **Outlier Dashboard**: Statistical anomalies with detailed metrics

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm

### Installation
```bash
npm install
```

### Development
```bash
# Start the Next.js development server
npm run dev

# Run the original analytics script (for backward compatibility)
npm run analyze

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

### GET /api/analytics
Returns comprehensive analytics data including:
- User segmentation and clustering
- Engagement metrics
- Team statistics
- Outlier detection results
- Top performers
- Statistical summaries

Example response structure:
```json
{
  "summary": {
    "totalUsers": 200,
    "totalTeams": 3,
    "correlationBalanceStep": 0.950,
    "clusters": [...]
  },
  "users": [...],
  "teamStats": [...],
  "topPerformers": {
    "engagement": [...],
    "consistency": [...],
    "outliers": [...]
  },
  "statistics": {...}
}
```

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2
- **Analytics**: 
  - ml-kmeans for clustering
  - lodash for data manipulation
  - csv-parser for data ingestion
- **Build**: Next.js with TypeScript compilation

## Data Processing Pipeline

1. **Data Ingestion**: Reads user data from `users.csv`
2. **Preprocessing**: Normalizes and validates data types
3. **Feature Engineering**: Creates vectors for ML algorithms
4. **Clustering**: Applies K-means to segment users
5. **Metric Calculation**: Computes engagement and consistency scores
6. **Statistical Analysis**: Performs outlier detection and correlation analysis
7. **Recommendations**: Generates personalized suggestions
8. **Visualization**: Renders interactive charts and tables

## Dashboard Features

- **Real-time Data**: Live analytics processing
- **Interactive Charts**: Hover effects and detailed tooltips
- **Responsive Design**: Works on desktop and mobile devices
- **Performance Optimized**: Efficient data processing and rendering
- **Comprehensive Metrics**: Multiple analysis perspectives

## File Structure

```
├── src/
│   ├── app/
│   │   ├── api/analytics/route.ts    # Analytics API endpoint
│   │   ├── layout.tsx                # App layout
│   │   ├── page.tsx                  # Dashboard page
│   │   └── globals.css               # Global styles
│   └── types/
│       └── csv-parser.d.ts           # Type definitions
├── index.js                          # Original analytics script
├── users.csv                         # Sample data
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Sample Data

The application includes sample data with 200 users across 3 teams, featuring:
- User demographics and contact information
- Activity metrics (steps, pushups, squats)
- Financial data (balance, transactions)
- Team assignments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - feel free to use this project for learning and development.