import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorageAdapter } from './inMemory';
import { FilterOptions } from '../../types'; // Assuming types are in ../../types

// Define a type for the test data for better type safety in tests
type TestItem = {
  name: string;
  type: string;
  value: number;
};

type OtherItem = {
    name: string;
    type: string;
};

type SimpleData = {
    data: string;
};

describe('InMemoryStorageAdapter', () => {
  let adapter: InMemoryStorageAdapter;
  const testCollection = 'testItems';
  const otherCollection = 'otherCollection';

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    // Ensure adapter is initialized if needed (though init is no-op here)
    adapter.init();
  });

  it('should initialize without errors', async () => {
    await expect(adapter.init()).resolves.toBeUndefined();
  });

  it('should set and get an item', async () => {
    const id = 'item1';
    const data = { name: 'Test Item', value: 123 }; // Less specific type here is fine
    await adapter.set(testCollection, id, data);
    const retrieved = await adapter.get<typeof data>(testCollection, id);
    expect(retrieved).toEqual(data);
    expect(retrieved).not.toBe(data); // Ensure it's a copy
  });

  it('should return null when getting a non-existent item', async () => {
    const retrieved = await adapter.get(testCollection, 'nonexistent');
    expect(retrieved).toBeNull();
  });

  it('should return null when getting from a non-existent collection', async () => {
    const retrieved = await adapter.get('nonexistentCollection', 'item1');
    expect(retrieved).toBeNull();
  });

  it('should update an existing item on set', async () => {
    const id = 'itemToUpdate';
    const initialData = { name: 'Initial', value: 1 };
    const updatedData = { name: 'Updated', value: 2 };
    await adapter.set(testCollection, id, initialData);
    await adapter.set(testCollection, id, updatedData);
    const retrieved = await adapter.get<typeof updatedData>(testCollection, id);
    expect(retrieved).toEqual(updatedData);
  });

   it('should handle deep copies correctly on set/get', async () => {
    const id = 'deepCopyTest';
    const originalData = { nested: { prop: 'value' } };
    await adapter.set(testCollection, id, originalData);

    // Modify original after setting
    originalData.nested.prop = 'modified_externally';

    const retrieved = await adapter.get<typeof originalData>(testCollection, id);
    expect(retrieved?.nested.prop).toBe('value'); // Should have original value

    // Modify retrieved and check original stored value
    if (retrieved) {
        retrieved.nested.prop = 'modified_retrieved';
    }
    const retrievedAgain = await adapter.get<typeof originalData>(testCollection, id);
     expect(retrievedAgain?.nested.prop).toBe('value'); // Stored value should be unchanged
  });


  it('should delete an item', async () => {
    const id = 'itemToDelete';
    const data = { name: 'Delete Me' };
    await adapter.set(testCollection, id, data);
    let retrieved = await adapter.get<typeof data>(testCollection, id); // Added type arg
    expect(retrieved).toEqual(data);

    await adapter.delete(testCollection, id);
    retrieved = await adapter.get(testCollection, id);
    expect(retrieved).toBeNull();
  });

  it('should not throw when deleting a non-existent item', async () => {
    await expect(adapter.delete(testCollection, 'nonexistent')).resolves.toBeUndefined();
  });

   it('should not throw when deleting from a non-existent collection', async () => {
    await expect(adapter.delete('nonexistentCollection', 'item1')).resolves.toBeUndefined();
  });

  describe('query', () => {
    beforeEach(async () => {
      // Seed data for query tests
      await adapter.set<TestItem>(testCollection, 'q1', { name: 'Query Item 1', type: 'A', value: 10 });
      await adapter.set<TestItem>(testCollection, 'q2', { name: 'Query Item 2', type: 'B', value: 20 });
      await adapter.set<TestItem>(testCollection, 'q3', { name: 'Query Item 3', type: 'A', value: 30 });
      await adapter.set<OtherItem>(otherCollection, 'o1', { name: 'Other 1', type: 'A' });
    });

    it('should return all items in a collection with empty filter', async () => {
      // Provide expected type for the query result
      const results = await adapter.query<TestItem>(testCollection, {});
      expect(results).toHaveLength(3);
      // Now 'r' has the type TestItem
      expect(results.map(r => r.name)).toEqual(expect.arrayContaining([
        'Query Item 1', 'Query Item 2', 'Query Item 3'
      ]));
    });

    it('should filter items based on exact match', async () => {
      const filterOptions: FilterOptions = { filter: { type: 'A' } };
      const results = await adapter.query<TestItem>(testCollection, filterOptions);
      expect(results).toHaveLength(2);
      expect(results.map(r => r.name)).toEqual(expect.arrayContaining([
        'Query Item 1', 'Query Item 3'
      ]));
      expect(results.every(r => r.type === 'A')).toBe(true);
    });

     it('should filter items based on multiple exact matches', async () => {
      const filterOptions: FilterOptions = { filter: { type: 'A', value: 30 } };
      const results = await adapter.query<TestItem>(testCollection, filterOptions);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Query Item 3');
    });

    it('should return empty array if no items match filter', async () => {
      const filterOptions: FilterOptions = { filter: { type: 'C' } };
      // Specify type even for expected empty array
      const results = await adapter.query<TestItem>(testCollection, filterOptions);
      expect(results).toHaveLength(0);
    });

    it('should return empty array when querying a non-existent collection', async () => {
      // Specify type even for expected empty array
      const results = await adapter.query<TestItem>('nonexistentQueryCollection', {});
      expect(results).toHaveLength(0);
    });

    it('should limit the number of results', async () => {
      const filterOptions: FilterOptions = { limit: 2 };
      // Specify expected type
      const results = await adapter.query<TestItem>(testCollection, filterOptions);
      expect(results).toHaveLength(2);
    });

     it('should apply filter and limit together', async () => {
      const filterOptions: FilterOptions = { filter: { type: 'A' }, limit: 1 };
       // Specify expected type
       const results = await adapter.query<TestItem>(testCollection, filterOptions);
      expect(results).toHaveLength(1);
       // 'results[0]' now has type TestItem
       expect(['Query Item 1', 'Query Item 3']).toContain(results[0].name);
    });

     it('should return deep copies from query', async () => {
        const filterOptions: FilterOptions = { filter: { name: 'Query Item 1' } };
        const results = await adapter.query<TestItem>(testCollection, filterOptions);
        expect(results).toHaveLength(1);
        const item = results[0];
        const originalValue = item.value;

        // Modify the retrieved item
        item.value = 999;

        // Re-query and check the stored value is unchanged
        const resultsAgain = await adapter.query<TestItem>(testCollection, filterOptions);
        expect(resultsAgain).toHaveLength(1);
        expect(resultsAgain[0].value).toBe(originalValue);
        expect(resultsAgain[0].value).not.toBe(999);
     });
  });

  it('should clear a specific collection', async () => {
    await adapter.set<SimpleData>(testCollection, 'item1', { data: 'a' });
    await adapter.set<SimpleData>(otherCollection, 'item2', { data: 'b' });

    await adapter.clearCollection(testCollection);

    const item1 = await adapter.get<SimpleData>(testCollection, 'item1');
    const item2 = await adapter.get<SimpleData>(otherCollection, 'item2');

    expect(item1).toBeNull();
    expect(item2).toEqual({ data: 'b' }); // Other collection should remain
  });

  it('should clear all collections', async () => {
    await adapter.set<SimpleData>(testCollection, 'item1', { data: 'a' });
    await adapter.set<SimpleData>(otherCollection, 'item2', { data: 'b' });

    await adapter.clearAll();

    const item1 = await adapter.get<SimpleData>(testCollection, 'item1');
    const item2 = await adapter.get<SimpleData>(otherCollection, 'item2');

    expect(item1).toBeNull();
    expect(item2).toBeNull();
    // Specify expected type for query results
    expect(await adapter.query<SimpleData>(testCollection, {})).toHaveLength(0);
    expect(await adapter.query<SimpleData>(otherCollection, {})).toHaveLength(0);
  });
});