"""
Database models and repository for prediction logging and user feedback

Uses SQLite for simple, file-based storage without external dependencies.
"""
import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)


class FeedbackDatabase:
    """Handles all database operations for prediction logging and feedback"""
    
    def __init__(self, db_path: str = "data/feedback.db"):
        """
        Initialize database connection
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
    
    @contextmanager
    def _get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable dict-like access
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            conn.close()
    
    def _init_database(self):
        """Create database tables if they don't exist"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Predictions table - logs every prediction made
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS predictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    request_id TEXT UNIQUE NOT NULL,
                    timestamp TEXT NOT NULL,
                    num_images INTEGER NOT NULL,
                    predicted_disease_id TEXT NOT NULL,
                    predicted_disease_name TEXT NOT NULL,
                    predicted_probability REAL NOT NULL,
                    top3_predictions TEXT NOT NULL,
                    confidence_status TEXT NOT NULL,
                    recommended_next_step TEXT NOT NULL,
                    retake_message TEXT,
                    quality_issues TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Feedback table - stores user corrections and ratings
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    request_id TEXT NOT NULL,
                    selected_disease_id TEXT NOT NULL,
                    was_prediction_helpful INTEGER NOT NULL,
                    notes TEXT,
                    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (request_id) REFERENCES predictions(request_id)
                )
            """)
            
            # Create indices for faster queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_predictions_request_id 
                ON predictions(request_id)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_predictions_timestamp 
                ON predictions(timestamp)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_feedback_request_id 
                ON feedback(request_id)
            """)
            
            conn.commit()
            logger.info(f"Database initialized at {self.db_path}")
    
    def log_prediction(
        self,
        request_id: str,
        num_images: int,
        predictions: List[Dict[str, Any]],
        confidence_status: str,
        recommended_next_step: str,
        retake_message: Optional[str] = None,
        quality_issues: Optional[List[str]] = None
    ) -> bool:
        """
        Log a prediction to the database
        
        Args:
            request_id: Unique identifier for this prediction
            num_images: Number of images in the request
            predictions: List of top predictions with disease_id, disease_name, prob
            confidence_status: HIGH, MEDIUM, or LOW
            recommended_next_step: SHOW_TREATMENT or RETAKE
            retake_message: Optional message for retake guidance
            quality_issues: Optional list of quality issues detected
        
        Returns:
            True if successful, False otherwise
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Extract top prediction
                top_pred = predictions[0] if predictions else {
                    "disease_id": "unknown",
                    "disease_name": "Unknown",
                    "prob": 0.0
                }
                
                cursor.execute("""
                    INSERT INTO predictions (
                        request_id, timestamp, num_images,
                        predicted_disease_id, predicted_disease_name, predicted_probability,
                        top3_predictions, confidence_status, recommended_next_step,
                        retake_message, quality_issues
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    request_id,
                    datetime.utcnow().isoformat(),
                    num_images,
                    top_pred['disease_id'],
                    top_pred['disease_name'],
                    top_pred['prob'],
                    json.dumps(predictions[:3]),  # Store top 3 as JSON
                    confidence_status,
                    recommended_next_step,
                    retake_message,
                    json.dumps(quality_issues) if quality_issues else None
                ))
                
                logger.info(f"Logged prediction for request {request_id}")
                return True
                
        except sqlite3.IntegrityError:
            logger.warning(f"Prediction with request_id {request_id} already exists")
            return False
        except Exception as e:
            logger.error(f"Error logging prediction: {e}")
            return False
    
    def submit_feedback(
        self,
        request_id: str,
        selected_disease_id: str,
        was_prediction_helpful: bool,
        notes: Optional[str] = None
    ) -> bool:
        """
        Submit user feedback for a prediction
        
        Args:
            request_id: Request ID of the prediction being rated
            selected_disease_id: Disease ID the user says is correct (or "unknown")
            was_prediction_helpful: Whether the prediction was helpful
            notes: Optional free-text notes from user
        
        Returns:
            True if successful, False otherwise
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Verify prediction exists
                cursor.execute(
                    "SELECT id FROM predictions WHERE request_id = ?",
                    (request_id,)
                )
                if not cursor.fetchone():
                    logger.warning(f"No prediction found for request_id {request_id}")
                    return False
                
                # Insert feedback
                cursor.execute("""
                    INSERT INTO feedback (
                        request_id, selected_disease_id, was_prediction_helpful, notes
                    ) VALUES (?, ?, ?, ?)
                """, (
                    request_id,
                    selected_disease_id,
                    1 if was_prediction_helpful else 0,
                    notes
                ))
                
                logger.info(f"Feedback submitted for request {request_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error submitting feedback: {e}")
            return False
    
    def get_prediction(self, request_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a prediction by request ID
        
        Returns:
            Dict with prediction data or None if not found
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM predictions WHERE request_id = ?",
                    (request_id,)
                )
                row = cursor.fetchone()
                
                if row:
                    return dict(row)
                return None
                
        except Exception as e:
            logger.error(f"Error retrieving prediction: {e}")
            return None
    
    def get_feedback_stats(self) -> Dict[str, Any]:
        """
        Get feedback statistics for monitoring
        
        Returns:
            Dict with various statistics
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Total predictions
                cursor.execute("SELECT COUNT(*) as count FROM predictions")
                total_predictions = cursor.fetchone()['count']
                
                # Total feedback
                cursor.execute("SELECT COUNT(*) as count FROM feedback")
                total_feedback = cursor.fetchone()['count']
                
                # Helpful feedback percentage
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total,
                        SUM(was_prediction_helpful) as helpful
                    FROM feedback
                """)
                feedback_row = cursor.fetchone()
                feedback_rate = (feedback_row['helpful'] / feedback_row['total'] * 100
                                if feedback_row['total'] > 0 else 0)
                
                # Confidence distribution
                cursor.execute("""
                    SELECT confidence_status, COUNT(*) as count
                    FROM predictions
                    GROUP BY confidence_status
                """)
                confidence_dist = {row['confidence_status']: row['count']
                                  for row in cursor.fetchall()}
                
                # Most common corrections
                cursor.execute("""
                    SELECT 
                        p.predicted_disease_id,
                        f.selected_disease_id,
                        COUNT(*) as count
                    FROM feedback f
                    JOIN predictions p ON f.request_id = p.request_id
                    WHERE p.predicted_disease_id != f.selected_disease_id
                    GROUP BY p.predicted_disease_id, f.selected_disease_id
                    ORDER BY count DESC
                    LIMIT 5
                """)
                common_corrections = [dict(row) for row in cursor.fetchall()]
                
                return {
                    "total_predictions": total_predictions,
                    "total_feedback": total_feedback,
                    "feedback_rate": f"{(total_feedback/total_predictions*100):.1f}%" 
                                    if total_predictions > 0 else "0%",
                    "helpful_rate": f"{feedback_rate:.1f}%",
                    "confidence_distribution": confidence_dist,
                    "common_corrections": common_corrections
                }
                
        except Exception as e:
            logger.error(f"Error getting feedback stats: {e}")
            return {}
    
    def export_training_data(self, output_path: str) -> bool:
        """
        Export feedback data for model retraining
        
        Args:
            output_path: Path to save JSON export
        
        Returns:
            True if successful
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Get all predictions with feedback
                cursor.execute("""
                    SELECT 
                        p.*,
                        f.selected_disease_id as user_correction,
                        f.was_prediction_helpful,
                        f.notes,
                        f.submitted_at as feedback_time
                    FROM predictions p
                    LEFT JOIN feedback f ON p.request_id = f.request_id
                """)
                
                rows = cursor.fetchall()
                data = [dict(row) for row in rows]
                
                # Save as JSON
                with open(output_path, 'w') as f:
                    json.dump({
                        "exported_at": datetime.utcnow().isoformat(),
                        "total_records": len(data),
                        "records": data
                    }, f, indent=2)
                
                logger.info(f"Exported {len(data)} records to {output_path}")
                return True
                
        except Exception as e:
            logger.error(f"Error exporting training data: {e}")
            return False


# Global database instance
_db_instance: Optional[FeedbackDatabase] = None


def get_feedback_db() -> FeedbackDatabase:
    """Get or create global database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = FeedbackDatabase()
    return _db_instance
