import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UnitService } from '../modules/unit/unit.service';
import { TypesenseService } from '../common/typesense/typesense.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('PopulateTypesense');
  
  try {
    logger.log('Starting Typesense population script...');
    
    // Create a NestJS app context to get services
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Get services
    const unitService = app.get(UnitService);
    const typesenseService = app.get(TypesenseService);
    
    // Try to drop the existing collection
    try {
      logger.log('Attempting to drop existing units collection...');
      await typesenseService.getClient().collections('units').delete();
      logger.log('Successfully dropped units collection');
    } catch (error) {
      // If collection doesn't exist, that's fine
      logger.log('No existing units collection to drop or unable to drop it');
    }
    
    // Initialize the collection with the updated schema
    logger.log('Initializing units collection with updated schema...');
    await typesenseService.initializeCollections();
    
    // Temporarily disable Typesense for the database queries
    // This is needed because there appears to be an issue with the Typesense query path
    const originalTypesenseSetting = process.env.USE_TYPESENSE;
    process.env.USE_TYPESENSE = 'false';
    logger.log('Temporarily disabled Typesense for database queries');
    
    // Get total count
    logger.log('Fetching units from database...');
    const [_, total] = await unitService.findAllWithCount({}, {}, 1, 0);
    logger.log(`Found ${total} total units. Processing in batches...`);
    
    // Process in batches of 200 to avoid pagination issues
    const batchSize = 200;
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    
    // Process all units in batches
    while (processedCount < total) {
      logger.log(`Processing batch ${processedCount} to ${Math.min(processedCount + batchSize, total)}`);
      
      // Get current batch
      const [units, _] = await unitService.findAllWithCount(
        {}, // No filter 
        {}, // No sort
        batchSize,
        processedCount
      );
      
      logger.log(`Retrieved ${units.length} units in this batch`);
      
      if (units.length > 0) {
        logger.log(`Sample unit ID: ${units[0].id}`);
      }
      
      // Import current batch to Typesense
      // Note: The Typesense service itself doesn't use the USE_TYPESENSE env var for indexing
      const batchResults = await typesenseService.importUnits(units);
      
      // Update counters
      const batchSuccessCount = batchResults.filter(r => !r.error).length;
      const batchErrorCount = batchResults.filter(r => r.error).length;
      
      successCount += batchSuccessCount;
      errorCount += batchErrorCount;
      
      // Collect errors (only the first few)
      if (errors.length < 5) {
        const newErrors = batchResults
          .filter(r => r.error)
          .slice(0, 5 - errors.length);
        errors = [...errors, ...newErrors];
      }
      
      processedCount += units.length;
      logger.log(`Batch processed: ${batchSuccessCount} successful, ${batchErrorCount} failed`);
    }
    
    // Restore original Typesense setting
    process.env.USE_TYPESENSE = originalTypesenseSetting;
    logger.log('Restored original Typesense setting');
    
    logger.log(`Successfully indexed ${successCount} units in Typesense.`);
    if (errorCount > 0) {
      logger.warn(`Failed to index ${errorCount} units.`);
      
      // Log the first few errors
      errors.forEach(error => {
        logger.error(`Error indexing unit: ${JSON.stringify(error)}`);
      });
    }
    
    // Close the application context
    await app.close();
    logger.log('Typesense population completed.');
  } catch (error) {
    logger.error(`Failed to populate Typesense: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

bootstrap(); 